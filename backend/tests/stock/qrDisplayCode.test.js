import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, asc, eq } from "drizzle-orm";

import stockInService from "../../src/modules/stock/services/stockIn.service.js";
import scanResolverService from "../../src/modules/sales/services/scanResolver.service.js";
import stockTransformationService from "../../src/modules/stock/services/stockTransformation.service.js";
import { parseDisplayCode } from "../../src/modules/stock/utils/qrDisplayCode.util.js";
import { design } from "../../src/modules/design/schemas/design.schema.js";
import { colorVariant } from "../../src/modules/design/schemas/colorVariant.schema.js";
import { designSize } from "../../src/modules/design/schemas/designSize.schema.js";
import { stockItem } from "../../src/modules/stock/schemas/stockItems.schema.js";
import { stockItemQr } from "../../src/modules/stock/schemas/stockItemQr.schema.js";
import { db, disconnect, truncate } from "../helpers/db.js";

beforeEach(() => truncate(["stock_in_challans", "designs"]));
afterAll(() => disconnect());

async function seedDesign(code, colours) {
    const [designRow] = await db.insert(design).values({ name: `${code} design`, code, normalizedCode: code.toLowerCase(), defaultSellingPricePerPiece: 300 }).returning();
    const variants = [];
    for (const colorName of colours) {
        const [variant] = await db.insert(colorVariant).values({
            designId: designRow.id, colorName, colorHex: "#2563EB", normalizedColorName: colorName.toLowerCase(),
            imageUrl: "https://example.test/p.jpg", imagePublicId: `t/${colorName}`, qrPayload: `${code}-${colorName}`,
        }).returning();
        await db.insert(designSize).values(["S", "M", "L", "XL"].map((label, index) => ({ variantId: variant.id, sizeLabel: label, displayOrder: index, includedInSet: true })));
        variants.push(variant);
    }
    return { design: designRow, variants };
}

let challanCounter = 0;
const inward = (fixture, variant, sets) => stockInService.registerStockIn({
    challan: { jobberName: "Ramesh", challanNo: `DC-${++challanCounter}`, issuedChallanNo: "ISS", stockDate: "2026-09-01", defectAction: "seconds" },
    designs: [{ designId: fixture.design.id, variants: [{
        colorVariantId: variant.id, totalSetsReceived: sets, bundles: [], loosePieces: [],
        tagging: { strategy: "parentChild", childTagsEnabled: false, tagLoosePieces: false },
    }] }],
});

// The short code issued for the item of this type/serial — what the QR itself carries.
async function shortCodeOf(variantId, type, serialNo) {
    const [row] = await db.select({ shortCode: stockItemQr.shortCode }).from(stockItemQr)
        .innerJoin(stockItem, eq(stockItemQr.stockItemId, stockItem.id))
        .where(and(eq(stockItem.colorVariantId, variantId), eq(stockItem.type, type), eq(stockItem.serialNo, serialNo), eq(stockItemQr.status, "ACTIVE")))
        .orderBy(asc(stockItemQr.id));
    return row?.shortCode;
}

describe("parseDisplayCode", () => {
    it("reads each label shape", () => {
        expect(parseDisplayCode("SET-KP100-GRE-007")).toEqual({ variantCode: "KP100-GRE", serialNo: 7, types: ["SET", "BUNDLE"] });
        expect(parseDisplayCode("semi-kp100-gre-008")).toEqual({ variantCode: "KP100-GRE", serialNo: 8, types: ["SET", "BUNDLE"] });
        expect(parseDisplayCode("KP-100-GRE-0012")).toEqual({ variantCode: "KP-100-GRE", serialNo: 12, types: ["PIECE"] });
        expect(parseDisplayCode("LSE-KP100-GRE-0013")).toEqual({ variantCode: "KP100-GRE", serialNo: 13, types: ["PIECE"] });
    });

    it("rejects text that can't be a label id", () => {
        expect(parseDisplayCode("K7M2QX")).toBeNull();
        expect(parseDisplayCode("SET-KP100-GRE-000")).toBeNull();
        expect(parseDisplayCode("")).toBeNull();
    });
});

describe("resolving the readable label id", () => {
    it("finds the same tag as its short code, for a set and for a piece", async () => {
        const fixture = await seedDesign("KP100", ["Green"]);
        const green = fixture.variants[0];
        await inward(fixture, green, 2);

        const set = await scanResolverService.resolve("SET-KP100-GRE-002");
        expect(set).toMatchObject({ state: "OK", kind: "SET", shortCode: await shortCodeOf(green.id, "SET", 2) });

        const piece = await scanResolverService.resolve("kp100-gre-0005");
        expect(piece).toMatchObject({ state: "OK", kind: "PIECE", shortCode: await shortCodeOf(green.id, "PIECE", 5) });
    });

    it("still resolves the short code itself", async () => {
        const fixture = await seedDesign("KP100", ["Green"]);
        await inward(fixture, fixture.variants[0], 1);
        const code = await shortCodeOf(fixture.variants[0].id, "SET", 1);

        expect(await scanResolverService.resolve(code)).toMatchObject({ state: "OK", shortCode: code });
    });

    it("is unknown for a serial that was never issued", async () => {
        const fixture = await seedDesign("KP100", ["Green"]);
        await inward(fixture, fixture.variants[0], 1);

        expect(await scanResolverService.resolve("SET-KP100-GRE-009")).toBeNull();
        expect(await scanResolverService.resolve("SET-KP999-GRE-001")).toBeNull();
    });

    it("refuses an id two colours share rather than guessing", async () => {
        const fixture = await seedDesign("KP100", ["Green", "Grey"]);
        await inward(fixture, fixture.variants[0], 1);
        await inward(fixture, fixture.variants[1], 1);

        expect(await scanResolverService.resolve("SET-KP100-GRE-001")).toMatchObject({ state: "DUPLICATE" });
    });

    it("works at the break-set station too", async () => {
        const fixture = await seedDesign("KP100", ["Green"]);
        await inward(fixture, fixture.variants[0], 1);

        const result = await stockTransformationService.resolveUnit("SET-KP100-GRE-001");
        expect(result.unit).toMatchObject({ kind: "SET", code: await shortCodeOf(fixture.variants[0].id, "SET", 1) });
    });
});

import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";

import { stockItem } from "../schemas/stockItems.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { design } from "../../design/schemas/design.schema.js";

// Shared by every current-stock aggregate below: CONSUMED source items were transformed into a
// replacement stock item (set/bundle assembly) and must not also be counted themselves — see
// stockItem.service.js (assembleSet/assembleBundle) and stockItemLineage for the transformation.
function isCurrentStock(colorVariantId, type) {
    return and(eq(stockItem.colorVariantId, colorVariantId), eq(stockItem.type, type), ne(stockItem.status, "CONSUMED"));
}

// SET/BUNDLE are the only stock item types a physical label ever gets attached to — a
// LOOSE_PIECE row represents fungible, individually-indistinguishable pieces, so it's
// never QR-eligible (see stockQr.service.js QR_ELIGIBLE_TYPES). CONSUMED items were
// transformed away by an assembly (see isCurrentStock above) and are excluded the same way.
function isQrEligible(keyword) {
    const conditions = [inArray(stockItem.type, ["SET", "BUNDLE"]), ne(stockItem.status, "CONSUMED")];

    if (keyword) {
        conditions.push(or(ilike(design.code, `%${keyword}%`), ilike(design.name, `%${keyword}%`), ilike(colorVariant.colorName, `%${keyword}%`)));
    }

    return and(...conditions);
}

const qrEligibleColumns = {
    stockItemId: stockItem.id,
    type: stockItem.type,
    status: stockItem.status,
    createdAt: stockItem.createdAt,
    colorVariantId: stockItem.colorVariantId,
    colorName: colorVariant.colorName,
    colorHex: colorVariant.colorHex,
    imageUrl: colorVariant.imageUrl,
    designId: design.id,
    designCode: design.code,
    designName: design.name,
};

class StockItemRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(stockItem).values(rows).returning();
    }

    async findById(tx, id) {
        const [result] = await tx.select().from(stockItem).where(eq(stockItem.id, id)).limit(1);
        return result;
    }

    async updateStatusIfCurrentAndFlippable(tx, id, { form, to, unsetAt }) {
        const [result] = await tx.update(stockItem).set({ status: to, unsetAt }).where(and(eq(stockItem.id, id), eq(stockItem.status, form), inArray(stockItem.type, ["SET", "BUNDLE"]))).returning();

        return result;
    }

    // Ek particular color variant + size ke available loose pieces find karo aur un rows ko lock kar do.
    async findAndLockAvailableBySize(tx, colorVariantId, designSizeId, limit) {
        return tx.select().from(stockItem)
            .where(and(
                eq(stockItem.colorVariantId, colorVariantId),
                eq(stockItem.type, "LOOSE_PIECE"),
                eq(stockItem.status, "UNSET"),
                eq(stockItem.designSizeId, designSizeId),
            ))
            .limit(limit)
            .for("update", { skipLocked: true }); // for update - Jo rows select ki hain, unko current transaction ke liye lock kar do.
    }

    async markConsumed(tx, ids) {
        if (ids.length === 0) return [];

        return tx.update(stockItem).set({ status: "CONSUMED" }).where(inArray(stockItem.id, ids)).returning();
    }

    // QR Center listing: individual SET/BUNDLE stock items (one physical label each), joined
    // with the design/variant identity a printed label needs. Deliberately not aggregated —
    // unlike countAvailableSets/countBundlesByStockGroup below, every eligible row here is a
    // distinct physical unit a QR can be generated for.
    async findQrEligible(tx, { limit, offset, keyword }) {
        return tx.select(qrEligibleColumns).from(stockItem)
            .innerJoin(colorVariant, eq(stockItem.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(isQrEligible(keyword))
            .orderBy(desc(stockItem.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async countQrEligible(tx, { keyword }) {
        const [result] = await tx.select({ value: count() }).from(stockItem)
            .innerJoin(colorVariant, eq(stockItem.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(isQrEligible(keyword));

        return result.value;
    }

    // Same eligibility rule as findQrEligible, scoped to a specific set of ids — used by QR
    // generation to both validate the request and fetch the design/variant identity the QR
    // payload needs, in one query.
    async findEligibleByIds(tx, ids) {
        if (ids.length === 0) return [];

        return tx.select(qrEligibleColumns).from(stockItem)
            .innerJoin(colorVariant, eq(stockItem.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(and(inArray(stockItem.id, ids), inArray(stockItem.type, ["SET", "BUNDLE"]), ne(stockItem.status, "CONSUMED")));
    }

    // One row per physical loose piece, already scoped to its exact designSizeId — no composition
    // explosion needed, unlike SET/BUNDLE below.
    async countLoosePiecesBySize(tx, colorVariantId) {
        return tx.select({
            designSizeId: stockItem.designSizeId,
            pieceCount: count(),
        }).from(stockItem)
            .where(isCurrentStock(colorVariantId, "LOOSE_PIECE"))
            .groupBy(stockItem.designSizeId);
    }

    // A single number: how many current SET stock items this variant has. Each SET row has no
    // designSizeId of its own (it spans every set-eligible size) — the caller explodes this count
    // across the variant's currently active & includedInSet design_sizes.
    async countAvailableSets(tx, colorVariantId) {
        const [result] = await tx.select({ value: count() }).from(stockItem)
            .where(isCurrentStock(colorVariantId, "SET"));

        return result.value;
    }

    // Bundle count grouped by stockGroupId (recipe), NOT by designSizeId — a BUNDLE row has no
    // designSizeId either. The caller pairs this with stockGroup.compositionSignature to explode
    // each group's count into per-size pieces (bundleCount × compositionQuantityForSize).
    async countBundlesByStockGroup(tx, colorVariantId) {
        return tx.select({
            stockGroupId: stockItem.stockGroupId,
            bundleCount: count(),
        }).from(stockItem)
            .where(isCurrentStock(colorVariantId, "BUNDLE"))
            .groupBy(stockItem.stockGroupId);
    }
}

export default new StockItemRepository();

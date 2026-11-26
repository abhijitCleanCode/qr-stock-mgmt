import { and, eq, inArray } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { design } from "../schemas/design.schema.js";
import { jobber } from "../schemas/jobber.schema.js";
import { quality } from "../schemas/quality.schema.js";
import { pattern } from "../schemas/pattern.schema.js";
import { itemName } from "../schemas/itemName.schema.js";
import { normalizeDesignCode } from "../repositories/design.repository.js";
import { colorVariant } from "../schemas/colorVariant.schema.js";
import { normalizeColorName } from "../repositories/colorVariant.repository.js";

// Same normalisation the jobber/quality/pattern/item-name repositories use when they look a
// name up, so the preview reports a name as "new" exactly when registering it would create one.
const normalizeName = (name) => name.trim().toLowerCase().replace(/\s+/g, " ");

const LOOKUPS = [
    { key: "jobbers", table: jobber, field: "jobberName" },
    { key: "qualities", table: quality, field: "quality" },
    { key: "patterns", table: pattern, field: "pattern" },
    { key: "itemNames", table: itemName, field: "itemName" },
];

class DesignBulkPreviewService {
    // Read-only. Reports, for each design code in the file, whether it already exists (those are
    // skipped on import, whatever their pattern), and which names in the file don't exist yet
    // (those are created automatically on import, just as the register form does).
    async preview(designs) {
        const codes = [...new Set(designs.map((item) => normalizeDesignCode(item.code)))];
        const existingRows = await db
            .select({ normalizedCode: design.normalizedCode })
            .from(design)
            .where(inArray(design.normalizedCode, codes));
        const existingCodes = new Set(existingRows.map((row) => row.normalizedCode));

        // The active colours each existing design already has, so a file can add new colours to a
        // design without repeating the ones it has. Matched the same way registration matches them.
        const existingIds = await db
            .select({ id: design.id, normalizedCode: design.normalizedCode })
            .from(design)
            .where(inArray(design.normalizedCode, [...existingCodes]));
        const takenByCode = new Map();
        if (existingIds.length > 0) {
            const variants = await db
                .select({ designId: colorVariant.designId, normalizedColorName: colorVariant.normalizedColorName })
                .from(colorVariant)
                .where(and(inArray(colorVariant.designId, existingIds.map((row) => row.id)), eq(colorVariant.isActive, true)));
            const takenByDesignId = new Map();
            for (const variant of variants) {
                if (!takenByDesignId.has(variant.designId)) takenByDesignId.set(variant.designId, new Set());
                takenByDesignId.get(variant.designId).add(variant.normalizedColorName);
            }
            for (const row of existingIds) takenByCode.set(row.normalizedCode, takenByDesignId.get(row.id) ?? new Set());
        }

        const newLookups = {};
        for (const { key, table, field } of LOOKUPS) {
            const names = new Map();
            for (const item of designs) {
                const value = item[field];
                if (value?.trim()) names.set(normalizeName(value), value.trim().replace(/\s+/g, " "));
            }
            const normalized = [...names.keys()];
            const found = new Set();
            if (normalized.length > 0) {
                const rows = await db
                    .select({ normalizedName: table.normalizedName })
                    .from(table)
                    .where(inArray(table.normalizedName, normalized));
                rows.forEach((row) => found.add(row.normalizedName));
            }
            newLookups[key] = [...names.entries()].filter(([normalizedName]) => !found.has(normalizedName)).map(([, label]) => label);
        }

        return {
            designs: designs.map((item) => {
                const code = normalizeDesignCode(item.code);
                const exists = existingCodes.has(code);
                const taken = takenByCode.get(code) ?? new Set();
                // Colour names from the file that this design already has (the file's own spelling).
                const existingColors = exists ? (item.colors ?? []).filter((name) => taken.has(normalizeColorName(name))) : [];
                return { code: item.code, exists, existingColors };
            }),
            newLookups,
        };
    }
}

export default new DesignBulkPreviewService();

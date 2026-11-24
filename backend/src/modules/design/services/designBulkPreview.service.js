import { inArray } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { design } from "../schemas/design.schema.js";
import { jobber } from "../schemas/jobber.schema.js";
import { quality } from "../schemas/quality.schema.js";
import { pattern } from "../schemas/pattern.schema.js";
import { itemName } from "../schemas/itemName.schema.js";
import { normalizeDesignCode } from "../repositories/design.repository.js";

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
            designs: designs.map((item) => ({
                code: item.code,
                exists: existingCodes.has(normalizeDesignCode(item.code)),
            })),
            newLookups,
        };
    }
}

export default new DesignBulkPreviewService();

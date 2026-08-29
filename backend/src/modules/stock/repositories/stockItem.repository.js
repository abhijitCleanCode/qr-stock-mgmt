import { and, count, eq, inArray, ne } from "drizzle-orm";

import { stockItem } from "../schemas/stockItems.schema.js";

// Shared by every current-stock aggregate below: CONSUMED source items were transformed into a
// replacement stock item (set/bundle assembly) and must not also be counted themselves — see
// stockItem.service.js (assembleSet/assembleBundle) and stockItemLineage for the transformation.
function isCurrentStock(colorVariantId, type) {
    return and(eq(stockItem.colorVariantId, colorVariantId), eq(stockItem.type, type), ne(stockItem.status, "CONSUMED"));
}

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

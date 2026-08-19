import { and, eq, inArray } from "drizzle-orm";

import { stockItem } from "../schemas/stockItems.schema.js";


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
}

export default new StockItemRepository();

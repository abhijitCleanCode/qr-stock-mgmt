import { eq, sql } from "drizzle-orm";
import { variantInventory } from "../schemas/variantInventory.schema.js";

class VariantInventoryRepository {
    buildIncrementRows(colorVariantId, delta) {
        return [...delta.entries()].filter(([, quantity]) => quantity > 0)
            .map(([designSizeId, quantity]) => ({
                colorVariantId,
                designSizeId,
                quantity,
            }));
    }

    async findByColorVariantId(tx, colorVariantId) {
        return tx.select().from(variantInventory).where(eq(variantInventory.colorVariantId, colorVariantId));
    }

    // `rows` are deltas to add on top of whatever quantity already exists (or 0 if the
    // (colorVariantId, designSizeId) row doesn't exist yet), not absolute quantities.
    async upsertIncrement(tx, rows) {
        return tx.insert(variantInventory).values(rows)
            .onConflictDoUpdate({
                target: [variantInventory.colorVariantId, variantInventory.designSizeId],
                set: {
                    quantity: sql`${variantInventory.quantity} + excluded.quantity`,
                    updatedAt: new Date(),
                },
            })
            .returning();
    }
}

export default new VariantInventoryRepository();

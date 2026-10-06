import { eq, inArray, sql } from "drizzle-orm";

import { stockItem } from "../schemas/stockItems.schema.js";
import { variantSerialCounter } from "../schemas/variantSerialCounter.schema.js";

class VariantSerialCounterRepository {
    async findByVariantIds(runner, colorVariantIds) {
        if (colorVariantIds.length === 0) return [];

        return runner.select().from(variantSerialCounter).where(inArray(variantSerialCounter.colorVariantId, colorVariantIds));
    }

    // Moves the counters forward by `sets`/`pieces` and returns the first serial of each reserved
    // run. The upsert takes the row lock, so two inwards for the same variant are serialised.
    async reserve(tx, colorVariantId, { sets, pieces }) {
        const [row] = await tx
            .insert(variantSerialCounter)
            .values({ colorVariantId, lastSetSerial: sets, lastPieceSerial: pieces })
            .onConflictDoUpdate({
                target: variantSerialCounter.colorVariantId,
                set: {
                    lastSetSerial: sql`${variantSerialCounter.lastSetSerial} + ${sets}`,
                    lastPieceSerial: sql`${variantSerialCounter.lastPieceSerial} + ${pieces}`,
                },
            })
            .returning();

        return { setStart: row.lastSetSerial - sets + 1, pieceStart: row.lastPieceSerial - pieces + 1 };
    }

    async assignSerials(tx, assignments) {
        for (const { stockItemId, serialNo } of assignments) {
            await tx.update(stockItem).set({ serialNo }).where(eq(stockItem.id, stockItemId));
        }
    }
}

export default new VariantSerialCounterRepository();

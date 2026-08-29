import { and, eq, inArray, isNull } from "drizzle-orm";
import { stockGroup } from "../schemas/stockGroup.schema.js";

class StockGroupRepository {
    async findByIds(tx, ids) {
        if (ids.length === 0) return [];

        return tx.select().from(stockGroup).where(inArray(stockGroup.id, ids));
    }

    async findOrCreate(tx, { colorVariantId, type, compositionSignature = null }) {
        const [inserted] = await tx.insert(stockGroup).values({ colorVariantId, type, compositionSignature }).onConflictDoNothing().returning();

        if (inserted) return inserted;

        return this._findExisting(tx, { colorVariantId, type, compositionSignature });
    }

    async _findExisting(tx, { colorVariantId, type, compositionSignature }) {
        const conditions = [eq(stockGroup.colorVariantId, colorVariantId), eq(stockGroup.type, type)];

        conditions.push(compositionSignature === null
            ? isNull(stockGroup.compositionSignature)
            : eq(stockGroup.compositionSignature, compositionSignature)
        );

        const [existing] = await tx.select().from(stockGroup).where(and(...conditions)).limit(1);

        return existing;
    }
}

export default new StockGroupRepository();

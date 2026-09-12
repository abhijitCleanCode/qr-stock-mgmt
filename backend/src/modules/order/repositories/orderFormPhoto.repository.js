import { and, count, eq, inArray } from "drizzle-orm";

import { orderFormPhoto } from "../schemas/orderFormPhoto.schema.js";

class OrderFormPhotoRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(orderFormPhoto).values(rows).returning();
    }

    async findByOrderFormId(runner, orderFormId) {
        return runner.select().from(orderFormPhoto)
            .where(eq(orderFormPhoto.orderFormId, orderFormId))
            .orderBy(orderFormPhoto.createdAt);
    }

    // Scoped by orderFormId as well as id — a photo id alone is never enough to authorize a
    // delete, since a caller could otherwise pass any photoId regardless of which order form
    // the URL claims to be acting on.
    async findByIdAndOrderFormId(runner, id, orderFormId) {
        const [result] = await runner.select().from(orderFormPhoto)
            .where(and(eq(orderFormPhoto.id, id), eq(orderFormPhoto.orderFormId, orderFormId)))
            .limit(1);

        return result;
    }

    async deleteById(tx, id) {
        return tx.delete(orderFormPhoto).where(eq(orderFormPhoto.id, id));
    }

    // Which of the given variants already have a DESIGN-sourced photo on this order form —
    // used to insert only the ones still missing, so a repeat save never duplicates rows.
    async findExistingDesignPhotoVariantIds(runner, orderFormId, colorVariantIds) {
        if (colorVariantIds.length === 0) return [];

        const rows = await runner.select({ colorVariantId: orderFormPhoto.colorVariantId }).from(orderFormPhoto)
            .where(and(
                eq(orderFormPhoto.orderFormId, orderFormId),
                eq(orderFormPhoto.source, "DESIGN"),
                inArray(orderFormPhoto.colorVariantId, colorVariantIds)
            ));

        return rows.map((row) => row.colorVariantId);
    }

    async countByOrderFormId(runner, orderFormId) {
        const [result] = await runner.select({ value: count() }).from(orderFormPhoto)
            .where(eq(orderFormPhoto.orderFormId, orderFormId));

        return result.value;
    }
}

export default new OrderFormPhotoRepository();

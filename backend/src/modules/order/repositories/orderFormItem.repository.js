import { eq, inArray } from "drizzle-orm";

import { orderFormItem } from "../schemas/orderFormItem.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { design } from "../../design/schemas/design.schema.js";

const itemColumns = {
    id: orderFormItem.id,
    orderFormId: orderFormItem.orderFormId,
    type: orderFormItem.type,
    quantity: orderFormItem.quantity,
    loosePiecesBreakdown: orderFormItem.loosePiecesBreakdown,
    unitPrice: orderFormItem.unitPrice,
    estimatedValue: orderFormItem.estimatedValue,
    colorVariantId: orderFormItem.colorVariantId,
    colorName: colorVariant.colorName,
    colorHex: colorVariant.colorHex,
    imageUrl: colorVariant.imageUrl,
    designId: design.id,
    designCode: design.code,
    designName: design.name,
};

class OrderFormItemRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(orderFormItem).values(rows).returning();
    }

    async findByOrderFormId(runner, orderFormId) {
        return runner.select(itemColumns).from(orderFormItem)
            .innerJoin(colorVariant, eq(orderFormItem.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(eq(orderFormItem.orderFormId, orderFormId))
            .orderBy(orderFormItem.id);
    }

    // Same shape as findByOrderFormId, scoped to many order forms at once — used to build the
    // list view's summary tiles (Total Designs/Sets/Loose Pieces/Value per row) without one
    // query per row.
    async findByOrderFormIds(runner, orderFormIds) {
        if (orderFormIds.length === 0) return [];

        return runner.select(itemColumns).from(orderFormItem)
            .innerJoin(colorVariant, eq(orderFormItem.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(inArray(orderFormItem.orderFormId, orderFormIds));
    }

    async deleteByOrderFormId(tx, orderFormId) {
        return tx.delete(orderFormItem).where(eq(orderFormItem.orderFormId, orderFormId));
    }
}

export default new OrderFormItemRepository();

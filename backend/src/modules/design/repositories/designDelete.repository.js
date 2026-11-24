import { eq, inArray, sql } from "drizzle-orm";

import { design } from "../schemas/design.schema.js";
import { colorVariant } from "../schemas/colorVariant.schema.js";
import { stockItem } from "../../stock/schemas/stockItems.schema.js";
import { stockInEntry } from "../../stock/schemas/stockInEntry.schema.js";
import { stockInTransaction } from "../../stock/schemas/stockInTransaction.schema.js";
import { stockHistory } from "../../stock/schemas/stockHistory.schema.js";
import { stockAdjustment } from "../../stock/schemas/stockAdjustment.schema.js";
import { stockOutEntry } from "../../stock/schemas/stockOutEntry.schema.js";
import { stockTransformation } from "../../stock/schemas/stockTransformation.schema.js";
import { variantInventory } from "../../inventory/schemas/variantInventory.schema.js";
import { variantStatusTransaction } from "../../inventory/schemas/variantStatusTransaction.schema.js";
import { invoiceEntry } from "../../sales/schemas/invoiceEntry.schema.js";
import { orderFormItem } from "../../sales/schemas/orderFormItem.schema.js";

// Every table that records stock or sales against a colour variant. A design with a row in any
// of them has been used, so it is kept. Registering a design writes to none of these.
const USAGE = [
    { label: "stock in entries", table: stockInEntry, column: stockInEntry.colorVariantId },
    { label: "stock in transactions", table: stockInTransaction, column: stockInTransaction.variantId },
    { label: "stock items", table: stockItem, column: stockItem.colorVariantId },
    { label: "stock out entries", table: stockOutEntry, column: stockOutEntry.colorVariantId },
    { label: "stock history", table: stockHistory, column: stockHistory.colorVariantId },
    { label: "stock adjustments", table: stockAdjustment, column: stockAdjustment.colorVariantId },
    { label: "stock transformations", table: stockTransformation, column: stockTransformation.colorVariantId },
    { label: "variant inventory", table: variantInventory, column: variantInventory.colorVariantId },
    { label: "status changes", table: variantStatusTransaction, column: variantStatusTransaction.colorVariantId },
    { label: "invoices", table: invoiceEntry, column: invoiceEntry.colorVariantId },
    { label: "order forms", table: orderFormItem, column: orderFormItem.colorVariantId },
];

class DesignDeleteRepository {
    // Locks the design row so a stock-in for it can't be saved between the check and the delete.
    async lockDesign(tx, id) {
        const [row] = await tx.select().from(design).where(eq(design.id, id)).limit(1).for("update");
        return row;
    }

    async findVariants(tx, designId) {
        return tx
            .select({ id: colorVariant.id, imageUrl: colorVariant.imageUrl, imagePublicId: colorVariant.imagePublicId })
            .from(colorVariant)
            .where(eq(colorVariant.designId, designId));
    }

    // Labels of the stock and sales tables that already hold a row for any of these variants.
    async findUsage(tx, variantIds) {
        const used = [];
        for (const { label, table, column } of USAGE) {
            const [hit] = await tx.select({ one: sql`1` }).from(table).where(inArray(column, variantIds)).limit(1);
            if (hit) used.push(label);
        }
        return used;
    }

    // Colour variants, sizes, semi sets, tag presets and serial counters go with it (ON DELETE CASCADE).
    async delete(tx, id) {
        await tx.delete(design).where(eq(design.id, id));
    }
}

export default new DesignDeleteRepository();

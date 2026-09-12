import { integer, jsonb, numeric, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

import { orderForm } from "./orderForm.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";

export const orderFormItemTypeEnum = pgEnum("order_form_item_type", ["SET", "LOOSE_PIECE"]);

// One line on the quote: either "N sets of this variant" or "these loose pieces, broken down
// by size" — never both on the same row (mirrors the reference table's two separate rows for
// the same design). Nothing here is checked against real stock; quantity is whatever the
// wholesaler is proposing to sell, and unitPrice is editable per line (loose pieces thrown in
// as a discount/freebie commonly price at 0 — see stockOut's business context).
export const orderFormItem = pgTable("order_form_items", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    orderFormId: integer("order_form_id").notNull().references(() => orderForm.id, { onDelete: "cascade" }),

    colorVariantId: integer("color_variant_id").notNull().references(() => colorVariant.id),

    type: orderFormItemTypeEnum("type").notNull(),

    // SET: number of sets. LOOSE_PIECE: total pieces across every size in loosePiecesBreakdown
    // (kept in sync by the service layer, not the DB) — one number either way for the
    // "Quantity" column, so the summary tiles never need to branch on type to sum it.
    quantity: integer("quantity").notNull(),

    // Only populated for LOOSE_PIECE rows: Record<designSizeId, quantity>, for the "Loose
    // Pieces" column's per-size breakdown (e.g. "S: 2, M: 1, L: 1").
    loosePiecesBreakdown: jsonb("loose_pieces_breakdown"),

    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),

    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

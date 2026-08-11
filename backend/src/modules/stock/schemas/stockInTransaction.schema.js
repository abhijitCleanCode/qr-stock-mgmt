import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";

export const stockInTransaction = pgTable("stock_in_transactions", {
    id: integer("id")
        .primaryKey()
        .generatedAlwaysAsIdentity(),

    variantId: integer("variant_id").notNull().references(() => colorVariant.id, { onDelete: "cascade" }),

    // supplierId: integer("supplier_id")
    //     .notNull()
    //     .references(() => supplier.id),

    totalSetsReceived: integer("total_sets_received")
        .notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
});

import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { design } from "../../design/schemas/design.schema.js";

export const stockInTransaction = pgTable("stock_in_transactions", {
    id: integer("id")
        .primaryKey()
        .generatedAlwaysAsIdentity(),

    designId: integer("design_id")
        .notNull()
        .references(() => design.id),

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
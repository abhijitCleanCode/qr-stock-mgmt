import { boolean, integer, numeric, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const designSize = pgTable("design_sizes", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    designId: integer("design_id").notNull().references(() => design.id, { onDelete: "cascade" }),

    sizeLabel: varchar("size_label", { length: 50 }).notNull(),

    displayOrder: integer("display_order")
        .default(0)
        .notNull(),

    unsetPricePerSize: numeric("unset_price_per_size", {
        precision: 10,
        scale: 2,
    }),

    isActive: boolean("is_active")
        .default(true)
        .notNull(),

    createdAt: timestamp("created_at")
        .defaultNow()
        .notNull(),
});

import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const design = pgTable("designs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }),

    defaultCostPricePerPiece: integer("default_cost_price_per_piece").notNull(),
    defaultSellingPricePerPiece: integer("default_selling_price_per_piece").notNull(),

    notes: varchar("notes", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

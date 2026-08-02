import { integer, PgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const design = PgTable("designs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }),

    defaultCostPrice: integer("default_cost_price").notNull(),
    defaultSellingPrice: integer("default_selling_price").notNull(),

    notes: varchar("notes", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

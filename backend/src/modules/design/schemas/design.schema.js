import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { jobber } from "./jobber.schema.js";

export const design = pgTable("designs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }),

    itemName: varchar("item_name", { length: 255 }),
    quality: varchar("quality", { length: 255 }),

    // nullable: the party a design was received from — not collected for designs registered
    // before this field existed, and not made mandatory going forward (see jobber.repository.js)
    jobberId: integer("jobber_id").references(() => jobber.id),

    // No longer collected on Register Design (superseded by defaultSellingPricePerPiece as the
    // only active price field) — kept nullable rather than dropped so existing designs' cost
    // price data isn't lost; new designs simply won't have a value here.
    defaultCostPricePerPiece: integer("default_cost_price_per_piece"),
    defaultSellingPricePerPiece: integer("default_selling_price_per_piece").notNull(),

    notes: varchar("notes", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

import { integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { jobber } from "./jobber.schema.js";
import { quality } from "./quality.schema.js";
import { pattern } from "./pattern.schema.js";

export const design = pgTable("designs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    // denormalized display copy of pattern.name at the time of registration — kept alongside
    // patternId (rather than joined on every read), same rationale as quality below.
    name: varchar("name", { length: 255 }).notNull(),
    patternId: integer("pattern_id").references(() => pattern.id),

    code: varchar("code", { length: 255 }),

    // trim + lowercase form of `code`, computed in the repository before insert — backs the
    // unique index below so re-registering the same pattern+code merges into the existing
    // design instead of creating a duplicate (see DesignService.registerDesign). Null when code
    // is blank — designs without a code aren't deduplicated against each other.
    normalizedCode: varchar("normalized_code", { length: 255 }),

    itemName: varchar("item_name", { length: 255 }),

    // denormalized display copy of quality.name at the time of registration — kept alongside
    // qualityId (rather than joined on every read) so existing designs registered before the
    // qualities table existed, and the designs table/columns, keep working without a join.
    quality: varchar("quality", { length: 255 }),
    qualityId: integer("quality_id").references(() => quality.id),

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
},
    (table) => [
        // patternId + normalizedCode identifies a design (see DesignRepository.findByIdentity).
        // Postgres treats each NULL as distinct, so rows with no code are exempt.
        uniqueIndex("designs_pattern_id_normalized_code_unique_idx").on(table.patternId, table.normalizedCode),
    ]
);

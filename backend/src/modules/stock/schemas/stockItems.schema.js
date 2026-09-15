import { index, integer, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

import { stockGroup, stockGroupTypeEnum } from "./stockGroup.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { stockInTransaction } from "./stockInTransaction.schema.js";
import { stockInBundle } from "./stockInBundle.schema.js";
import { designSize } from "../../design/schemas/designSize.schema.js";
import { rack } from "./rack.schema.js";
import { bin } from "./bin.schema.js";

// CONSUMED - Ye physical stock item kisi naye stock item ko create karne ke liye consume ho chuka hai. We are not deleting the stock item for maintaining lineage
export const stockItemStatusEnum = pgEnum("stock_item_status", ["AVAILABLE", "UNSET", "CONSUMED"]);

export const stockItem = pgTable("stock_items", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    stockGroupId: integer("stock_group_id").notNull().references(() => stockGroup.id, { onDelete: "cascade" }),

    colorVariantId: integer("color_variant_id").notNull().references(() => colorVariant.id, { onDelete: "cascade" }), // Every stock item should belong to a color variant

    designSizeId: integer("design_size_id").references(() => designSize.id, { onDelete: "cascade" }),

    // not null because stock can come from multiple places such as direct having transaction id and assembled not having transaction id
    stockInTransactionId: integer("stock_in_transaction_id").references(() => stockInTransaction.id, { onDelete: "cascade" }),

    bundleId: integer("bundle_id").references(() => stockInBundle.id, { onDelete: "cascade" }),

    type: stockGroupTypeEnum("type").notNull(),

    status: stockItemStatusEnum("status").default("AVAILABLE").notNull(), // item lifecycle

    unsetAt: timestamp("unset_at"), //  when it last transitioned to UNSET

    // Current physical location — set at QR generation / stock movement time, updated by Move
    // and Re-bag actions. Nullable: most stock items (loose pool, pre-QR Center) have no tracked
    // location yet.
    rackId: integer("rack_id").references(() => rack.id, { onDelete: "set null" }),
    binId: integer("bin_id").references(() => bin.id, { onDelete: "set null" }),

    // Set only on a PIECE-type item created by QR Center's "break set" (see
    // qrBreakSet.service.js) — points back at the SET stock item it was broken out of, which is
    // how the Resolver's Retired-code result finds its successor pieces and vice versa. Not a
    // stock_item_lineage row: that table enforces one result per source (a loose piece is
    // consumed into exactly one assembly), which can't express one SET fanning out into several
    // pieces — this plain FK on the many side has no such constraint.
    originSetStockItemId: integer("origin_set_stock_item_id").references(() => stockItem.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
},

    (table) => [
        index("stock_items_stock_group_id_idx").on(table.stockGroupId),

        index("stock_items_stock_in_transaction_id_idx").on(table.stockInTransactionId),

        index("stock_items_status_idx").on(table.status),

        index("stock_items_rack_id_idx").on(table.rackId),

        index("stock_items_origin_set_stock_item_id_idx").on(table.originSetStockItemId),
    ]
);

// UNSET → eligible for assembly
// CONSUMED → NOT eligible

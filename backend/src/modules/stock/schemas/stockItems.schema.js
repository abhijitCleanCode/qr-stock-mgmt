import { integer, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";

import { stockGroup, stockGroupTypeEnum } from "./stockGroup.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { stockInTransaction } from "./stockInTransaction.schema.js";
import { stockInBundle } from "./stockInBundle.schema.js";

const stockItemStatusEnum = pgEnum("stock_item_status", ["AVAILABLE", "UNSET"]);

export const stockItem = pgTable("stock_items", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    stockGroupId: integer("stock_group_id").notNull().references(() => stockGroup.id, { onDelete: "cascade" }),

    colorVariantId: integer("color_variant_id").notNull().references(() => colorVariant.id, { onDelete: "cascade" }), // Every SET/BUNDLE stock item should belong to a color variant.

    stockInTransactionId: integer("stock_in_transaction_id").notNull().references(() => stockInTransaction.id, { onDelete: "cascade" }),

    bundleId: integer("stock_in_bundle").references(() => stockInBundle.id, { onDelete: "cascade" }),

    type: stockGroupTypeEnum("type").notNull(),

    status: stockItemStatusEnum("item").default("AVAILABLE").notNull(), // item lifecycle

    unsetAt: timestamp("unset_at"), //  when it last transitioned to UNSET

    createdAt: timestamp("created_at").defaultNow().notNull(),
},

    (table) => [
        index("stock_items_stock_group_id_idx").on(table.stockGroupId),

        index("stock_items_stock_in_transaction_id_idx").on(table.stockInTransactionId),

        index("stock_items_status_idx").on(table.status),
    ]
);

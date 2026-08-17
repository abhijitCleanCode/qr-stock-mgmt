import { integer, pgEnum, pgTable } from "drizzle-orm/pg-core";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";

export const stockGroupTypeEnum = pgEnum("stock_group_type", [ "SET", "BUNDLE" ]);

export const stockGroup = pgTable("stock_groups", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    colorVariantId: integer("color_variant_id").references(() => colorVariant.id, { onDelete: "cascade" }),

    type: stockGroupTypeEnum("type").notNull(),

    compositionSignature: varchar("composition_signature", { length: 500 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
},
    (table) => [
        index("stock_groups_color_variant_id_idx")
            .on(table.colorVariantId),

        uniqueIndex("stock_groups_set_unique_idx")
            .on(table.colorVariantId)
            .where(sql`${table.type} = 'SET'`),

        uniqueIndex("stock_groups_bundle_unique_idx")
            .on(table.colorVariantId, table.compositionSignature)
            .where(sql`${table.type} = 'BUNDLE'`),
    ]
);

import { integer, pgTable } from "drizzle-orm/pg-core";

import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { designSize } from "../../design/schemas/designSize.schema.js";

// core table: current status of inventory, set vs unset
export const VariantInventory = pgTable("variant_inventory", {
    id: integerer("id").primaryKey().generatedAlwaysAsIdentity(),

    colorVariantId: integer("color_variant_id")
        .notNull()
        .references(() => colorVariant.id, {
            onDelete: "cascade",
        }),

    designSizeId: integer("design_size_id")
        .notNull()
        .references(() => designSize.id, {
            onDelete: "cascade",
        }),

    quantity: integer("quantity")
        .default(0)
        .notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdateFn(() => new Date())
        .notNull(),
});

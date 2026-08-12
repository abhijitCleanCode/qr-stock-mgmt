import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { design } from "./design.schema.js";

export const colorVariant = pgTable("color_variants", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    designId: integer("design_id").notNull().references(() => design.id, { onDelete: "cascade" }),

    colorName: varchar("color_name", { length: 100 }).notNull(),
    colorHex: varchar("color_hex", { length: 7 }).notNull(),

    qrPayload: varchar("qr_payload", { length: 255 }).notNull(),
    qrGeneratedAt: timestamp("qr_generated_at"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdateFn(() => new Date()),
});

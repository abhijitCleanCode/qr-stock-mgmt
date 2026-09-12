import { date, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// DRAFT: being put together. SHARED: sent to the retailer for confirmation. CONVERTED: turned
// into a real bill/invoice (no such module exists yet — this status is a placeholder for that
// future flow). CANCELLED: retailer declined / order form abandoned.
export const orderFormStatusEnum = pgEnum("order_form_status", ["DRAFT", "SHARED", "CONVERTED", "CANCELLED"]);

// A temporary, pre-sale quote for a retailer — never touches real inventory (see
// orderFormItem.schema.js). No Retailer master data module exists yet, so retailer identity is
// plain text here rather than a foreign key.
export const orderForm = pgTable("order_forms", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    retailerName: text("retailer_name").notNull(),
    contactPerson: text("contact_person"),
    location: text("location"),

    orderDate: date("order_date").notNull(),

    status: orderFormStatusEnum("status").default("DRAFT").notNull(),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

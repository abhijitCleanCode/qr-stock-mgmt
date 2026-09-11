import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { orderForm } from "./orderForm.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";

// UPLOADED: added by a user through the gallery's "Add Photos" tile. DESIGN: auto-added by
// orderFormPhotoSync.service.js from a selected item's color variant image, the moment that
// variant is saved onto the order form — see orderForm.service.js.
export const orderFormPhotoSourceEnum = pgEnum("order_form_photo_source", ["UPLOADED", "DESIGN"]);

// A photo attached to an order form's Item Photos Gallery (e.g. product shots taken while
// putting the quote together, or a selected design's own image). Always belongs to exactly
// one order form — cascades on delete so removing an order form never leaves orphaned gallery
// rows behind.
export const orderFormPhoto = pgTable("order_form_photos", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    orderFormId: integer("order_form_id").notNull().references(() => orderForm.id, { onDelete: "cascade" }),

    imageUrl: text("image_url").notNull(),
    // Cloudinary public_id — needed to destroy the asset in storage on delete, and to build
    // the "Download All" zip archive without re-deriving it from the URL. For a DESIGN-sourced
    // row this is the *same* asset the color variant itself points to (no re-upload), so
    // deleting this row must never destroy it — see orderFormPhoto.service.deletePhoto.
    imagePublicId: text("image_public_id").notNull(),

    source: orderFormPhotoSourceEnum("source").default("UPLOADED").notNull(),
    // Set only when source is DESIGN — which variant this photo was sourced from, so a repeat
    // save of the order form can tell "already added" from "needs adding" without re-uploading
    // or duplicating rows.
    colorVariantId: integer("color_variant_id").references(() => colorVariant.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

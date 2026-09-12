import { z } from "zod";

const nonNegativeInt = z.number().int().nonnegative();

// multipart/form-data can only carry flat text fields — colorVariants/designSizes arrive
// as a JSON-stringified field on this route, so they need parsing back into arrays before
// the shape below can validate them. Plain JSON requests (already-parsed arrays) pass through.
const jsonField = (schema) =>
    z.preprocess((value) => {
        if (typeof value !== "string") return value;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }, schema);

const colorVariantInputSchema = z.object({
    colorName: z.string().trim().min(1),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "colorHex must be a hex color like #FF0000"),
});

const designSizeInputSchema = z.object({
    sizeLabel: z.string().trim().min(1),
    displayOrder: nonNegativeInt.default(0),
    unsetPricePerSize: z.number().nonnegative().optional(),
    includedInSet: z.boolean().default(true),
});

export const listDesignsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchDesignsQuerySchema = z.object({
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters"),
});

export const colorVariantSizesParamsSchema = z.object({
    colorVariantId: z.coerce.number().int().positive(),
});

export const registerDesignSchema = z.object({
    name: z.string().trim().min(1),
    code: z.string().trim().optional(),
    itemName: z.string().trim().min(1, "Item Name is required."),
    quality: z.string().trim().min(1, "Quality is required."),
    defaultSellingPricePerPiece: z.coerce.number().int().nonnegative(),
    notes: z.string().trim().optional(),

    // one image is required per entry — enforced against the uploaded file count in the
    // service layer, since multer's file count isn't part of req.body and can't be checked here
    colorVariants: jsonField(z.array(colorVariantInputSchema).min(1, "At least one color variant is required")),
    designSizes: jsonField(z.array(designSizeInputSchema)).default([]),
});

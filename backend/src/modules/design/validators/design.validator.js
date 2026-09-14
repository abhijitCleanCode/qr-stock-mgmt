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

export const searchJobbersQuerySchema = z.object({
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters"),
});

export const searchQualitiesQuerySchema = z.object({
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters"),
});

export const searchPatternsQuerySchema = z.object({
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters"),
});

export const colorVariantSizesParamsSchema = z.object({
    colorVariantId: z.coerce.number().int().positive(),
});

export const registerDesignSchema = z.object({
    // Pattern (e.g. Anarkali/Straight/Flair) is required, same as quality: name carries the
    // typed/selected name, patternId optionally selects an existing pattern by id. Backend
    // re-validates patternId rather than trusting it outright — see DesignService._resolvePattern.
    name: z.string().trim().min(1, "Pattern is required.").max(255),
    patternId: z.coerce.number().int().positive().optional(),

    code: z.string().trim().optional(),
    itemName: z.string().trim().min(1, "Item Name is required."),

    // Quality is required (unlike jobber): quality carries the typed/selected name, qualityId
    // optionally selects an existing quality by id. Backend re-validates qualityId rather than
    // trusting it outright — see DesignService._resolveQuality.
    quality: z.string().trim().min(1, "Quality is required.").max(255),
    qualityId: z.coerce.number().int().positive().optional(),

    defaultSellingPricePerPiece: z.coerce.number().int().nonnegative(),
    notes: z.string().trim().optional(),

    // Jobber is optional (backward compatible with designs registered before this field
    // existed): jobberId selects an existing jobber, jobberName resolves/creates one by name
    // when no id is given — see DesignService._resolveJobberId. Backend re-validates jobberId
    // rather than trusting it outright.
    jobberId: z.coerce.number().int().positive().optional(),
    jobberName: z.string().trim().min(1, "Jobber name cannot be blank.").max(255).optional(),

    // one image is required per entry — enforced against the uploaded file count in the
    // service layer, since multer's file count isn't part of req.body and can't be checked here
    colorVariants: jsonField(z.array(colorVariantInputSchema).min(1, "At least one color variant is required")),
    designSizes: jsonField(z.array(designSizeInputSchema)).default([]),
});

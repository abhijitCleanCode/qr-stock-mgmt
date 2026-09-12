import { z } from "zod";

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const compositionItemSchema = z.object({
    designSizeId: positiveInt,
    quantity: positiveInt,
});

const bundleSchema = z
    .object({
        bundleNumber: positiveInt.optional(),
        quantity: positiveInt,
        composition: z.array(compositionItemSchema).min(1),
    })
    .superRefine((bundle, ctx) => {
        const seen = new Set();
        for (const [index, item] of bundle.composition.entries()) {
            if (seen.has(item.designSizeId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["composition", index, "designSizeId"],
                    message: `Duplicate designSizeId ${item.designSizeId} within a single bundle's composition.`,
                });
            }
            seen.add(item.designSizeId);
        }
    });

const loosePieceSchema = z.object({
    designSizeId: positiveInt,
    quantity: positiveInt,
});

// Challan No. is a free-form supplier/delivery reference — may contain letters, digits,
// leading zeros, and separators like "/" or "-" (e.g. "CH-00125", "INV/2026/001", "001245").
// Never coerced to a number, so leading zeros survive.
const challanNoSchema = z
    .string()
    .trim()
    .min(1, "Challan No. is required.")
    .max(100, "Challan No. must be at most 100 characters.");

// One Color Variant's stock registration within the overall request.
const variantEntrySchema = z
    .object({
        colorVariantId: positiveInt,
        // Delivery Date: the actual date stock was received. Required — the frontend always
        // sends it (defaulted to today, editable) — and stored as a date-only string, never
        // parsed into a Date object here, so no UTC shift can occur before it reaches the DB.
        stockDate: z.string().date(),
        challanNo: challanNoSchema,
        notes: z.string().max(1000).optional(),
        totalSetsReceived: nonNegativeInt.default(0),
        bundles: z.array(bundleSchema).default([]),
        loosePieces: z.array(loosePieceSchema).default([]),
    })
    .superRefine((variant, ctx) => {
        const hasSets = variant.totalSetsReceived > 0;
        const hasBundles = variant.bundles.length > 0;
        const hasLoosePieces = variant.loosePieces.length > 0;

        if (!hasSets && !hasBundles && !hasLoosePieces) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [],
                message: "Each variant must include at least one of totalSetsReceived, bundles, or loosePieces.",
            });
        }

        const seen = new Set();
        for (const [index, piece] of variant.loosePieces.entries()) {
            if (seen.has(piece.designSizeId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["loosePieces", index, "designSizeId"],
                    message: `Duplicate designSizeId ${piece.designSizeId} across loosePieces.`,
                });
            }
            seen.add(piece.designSizeId);
        }
    });

// One Design's group of Color Variant registrations within the overall request.
const designGroupSchema = z.object({
    designId: positiveInt,
    variants: z.array(variantEntrySchema).min(1),
});

export const stockInSchema = z
    .object({
        designs: z.array(designGroupSchema).min(1),
    })
    .superRefine((data, ctx) => {
        const seenDesignIds = new Set();
        data.designs.forEach((design, designIndex) => {
            if (seenDesignIds.has(design.designId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["designs", designIndex, "designId"],
                    message: `Duplicate designId ${design.designId} — group all of a design's variants under a single entry.`,
                });
            }
            seenDesignIds.add(design.designId);
        });

        // colorVariantId must be unique across the ENTIRE request, not just within one design.
        const seenColorVariantIds = new Set();
        data.designs.forEach((design, designIndex) => {
            design.variants.forEach((variant, variantIndex) => {
                if (seenColorVariantIds.has(variant.colorVariantId)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["designs", designIndex, "variants", variantIndex, "colorVariantId"],
                        message: `Duplicate colorVariantId ${variant.colorVariantId} across the request.`,
                    });
                }
                seenColorVariantIds.add(variant.colorVariantId);
            });
        });
    });

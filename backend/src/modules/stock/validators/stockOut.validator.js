import { z } from "zod";

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const bundleSaleSchema = z.object({
    stockGroupId: positiveInt,
    quantity: positiveInt,
});

const loosePieceSaleSchema = z.object({
    designSizeId: positiveInt,
    quantity: positiveInt,
});

// One Color Variant's stock-out registration within the overall request. Unlike Stock In,
// bundles here reference an existing stock group (a bundle composition already in stock),
// not a freely-defined composition — you can only sell what was actually assembled/received.
const variantEntrySchema = z
    .object({
        colorVariantId: positiveInt,
        stockDate: z.string().date().optional(),
        unitPrice: z.number().nonnegative(),
        totalSetsSold: nonNegativeInt.default(0),
        bundles: z.array(bundleSaleSchema).default([]),
        loosePieces: z.array(loosePieceSaleSchema).default([]),
    })
    .superRefine((variant, ctx) => {
        const hasSets = variant.totalSetsSold > 0;
        const hasBundles = variant.bundles.length > 0;
        const hasLoosePieces = variant.loosePieces.length > 0;

        if (!hasSets && !hasBundles && !hasLoosePieces) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [],
                message: "Each variant must include at least one of totalSetsSold, bundles, or loosePieces.",
            });
        }

        const seenGroupIds = new Set();
        for (const [index, bundle] of variant.bundles.entries()) {
            if (seenGroupIds.has(bundle.stockGroupId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["bundles", index, "stockGroupId"],
                    message: `Duplicate stockGroupId ${bundle.stockGroupId} across bundles.`,
                });
            }
            seenGroupIds.add(bundle.stockGroupId);
        }

        const seenSizeIds = new Set();
        for (const [index, piece] of variant.loosePieces.entries()) {
            if (seenSizeIds.has(piece.designSizeId)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["loosePieces", index, "designSizeId"],
                    message: `Duplicate designSizeId ${piece.designSizeId} across loosePieces.`,
                });
            }
            seenSizeIds.add(piece.designSizeId);
        }
    });

const designGroupSchema = z.object({
    designId: positiveInt,
    variants: z.array(variantEntrySchema).min(1),
});

export const stockOutSchema = z
    .object({
        // Not collected on the form for now — accepted as optional so it can be wired back up
        // later without another schema change.
        retailerName: z.string().trim().min(1).max(200).optional(),
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

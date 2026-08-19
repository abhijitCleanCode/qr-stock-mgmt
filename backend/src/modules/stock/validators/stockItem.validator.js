import { z } from "zod";

export const stockItemStatusSchema = z.object({
    status: z.enum(["SET", "UNSET"]),
});

export const assembleSetSchema = z.object({
    colorVariantId: z.number().int().positive(),
});

const compositionItemSchema = z.object({
    designSizeId: z.number().int().positive(),
    quantity: z.number().int().positive(),
});

export const assembleBundleSchema = z.object({
    colorVariantId: z.number().int().positive(),
    composition: z.array(compositionItemSchema).min(1),
}).superRefine((data, ctx) => {
    const seen = new Set();
    for (const [index, item] of data.composition.entries()) {
        if (seen.has(item.designSizeId)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["composition", index, "designSizeId"],
                message: `Duplicate designSizeId ${item.designSizeId} within composition.`,
            });
        }
        seen.add(item.designSizeId);
    }
});

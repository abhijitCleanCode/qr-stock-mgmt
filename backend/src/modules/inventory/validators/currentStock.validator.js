import { z } from "zod";

export const listCurrentStockQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters").optional(),
});

export const currentStockDetailParamsSchema = z.object({
    colorVariantId: z.coerce.number().int().positive(),
});

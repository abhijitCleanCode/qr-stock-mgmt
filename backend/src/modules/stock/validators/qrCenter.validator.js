import { z } from "zod";

export const listQrCenterQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters").optional(),
});

export const getRegistrationDetailParamsSchema = z.object({
    stockInTransactionId: z.coerce.number().int().positive(),
});

export const generateQrSchema = z.object({
    stockItemIds: z.array(z.number().int().positive()).min(1).max(200).transform((ids) => [...new Set(ids)]),
});

import { z } from "zod";

export const orderFormPhotoParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
    photoId: z.coerce.number().int().positive(),
});

export const orderFormNumberParamsSchema = z.object({
    // "OF-000158" — matches orderFormMapper's formatOrderFormNumber output exactly.
    orderFormNumber: z.string().regex(/^OF-\d{6}$/, "Invalid order form number."),
});

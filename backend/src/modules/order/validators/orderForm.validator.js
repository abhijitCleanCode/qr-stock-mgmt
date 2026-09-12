import { z } from "zod";

const positiveInt = z.number().int().positive();

const setItemSchema = z.object({
    colorVariantId: positiveInt,
    type: z.literal("SET"),
    quantity: positiveInt,
    unitPrice: z.number().nonnegative(),
});

const loosePieceItemSchema = z.object({
    colorVariantId: positiveInt,
    type: z.literal("LOOSE_PIECE"),
    // Record<designSizeId, quantity> as string-keyed JSON — quantity is re-derived from this
    // server-side (sum of values) rather than trusted from a separate field.
    loosePiecesBreakdown: z.record(z.string(), positiveInt).refine((breakdown) => Object.keys(breakdown).length > 0, {
        message: "loosePiecesBreakdown must include at least one size.",
    }),
    unitPrice: z.number().nonnegative(),
});

const itemSchema = z.discriminatedUnion("type", [setItemSchema, loosePieceItemSchema]);

// No stock validation here (see orderForm.service.js) — an order form is a pre-sale quote,
// not a real stock movement, so quantities are never checked against variant_inventory.
export const createOrderFormSchema = z.object({
    retailerName: z.string().trim().min(1, "Retailer name is required.").max(200),
    contactPerson: z.string().trim().max(200).optional(),
    location: z.string().trim().max(200).optional(),
    orderDate: z.string().date().optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(itemSchema).min(1, "Add at least one item before saving the order form."),
});

export const updateOrderFormSchema = createOrderFormSchema;

export const updateOrderFormStatusSchema = z.object({
    status: z.enum(["DRAFT", "SHARED", "CONVERTED", "CANCELLED"]),
});

export const listOrderFormsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    keyword: z.string().trim().min(1).optional(),
    status: z.enum(["DRAFT", "SHARED", "CONVERTED", "CANCELLED"]).optional(),
});

export const orderFormIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

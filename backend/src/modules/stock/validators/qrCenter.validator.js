import { z } from "zod";

export const listQrCenterQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    keyword: z.string().trim().min(2, "Search keyword must be at least 2 characters").optional(),
    designId: z.coerce.number().int().positive().optional(),
    colorVariantId: z.coerce.number().int().positive().optional(),
    dateFrom: z.string().trim().optional(),
    dateTo: z.string().trim().optional(),
    sort: z.enum(["new", "old"]).default("new"),
});

export const printBatchQueueSchema = z.object({
    printerId: z.number().int().positive().optional(),
});

// --- QR Center: tag search ---------------------------------------------------

export const searchTagsQuerySchema = z.object({
    keyword: z.string().trim().min(1).optional(),
    designId: z.coerce.number().int().positive().optional(),
    colorVariantId: z.coerce.number().int().positive().optional(),
    type: z.enum(["SET", "BUNDLE", "PIECE", "LOOSE_PIECE"]).optional(),
    days: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(30),
});

export const getRegistrationDetailParamsSchema = z.object({
    stockInTransactionId: z.coerce.number().int().positive(),
});

export const getTransformationDetailParamsSchema = z.object({
    transformationId: z.coerce.number().int().positive(),
});

export const generateQrSchema = z.object({
    stockItemIds: z.array(z.number().int().positive()).min(1).max(200).transform((ids) => [...new Set(ids)]),
});

// --- QR Center: resolve ---------------------------------------------------

export const resolveQuerySchema = z.object({
    code: z.string().trim().min(1, "code is required"),
});

// --- QR Center: to-tag -----------------------------------------------------

export const toTagQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// --- QR Center: reprints -----------------------------------------------------

export const REPRINT_REASON_CODES = ["LOST", "TORN", "FADED", "REBAG", "JAM", "PRICE_CHANGE"];

export const listReprintsQuerySchema = z.object({
    status: z.enum(["PENDING", "PRINTED"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createReprintSchema = z.object({
    stockItemId: z.number().int().positive(),
    reasonCode: z.enum(REPRINT_REASON_CODES),
    raisedBy: z.string().trim().min(1, "raisedBy is required").max(100),
    rackId: z.number().int().positive().optional(),
});

export const bulkPrintReprintsSchema = z.object({
    reprintRequestIds: z.array(z.number().int().positive()).min(1).transform((ids) => [...new Set(ids)]),
    printerId: z.number().int().positive(),
});

// --- QR Center: stale -----------------------------------------------------

export const staleReprintSchema = z.object({
    designId: z.number().int().positive(),
    scope: z.enum(["ALL", "ON_HAND"]),
});

export const staleAcceptSchema = z.object({
    designId: z.number().int().positive(),
});

// --- QR Center: recovery -----------------------------------------------------

export const listRecoveryQuerySchema = z.object({
    status: z.enum(["PENDING", "ASSIGNED"]).optional(),
});

export const createRecoverySchema = z.object({
    foundLocation: z.string().trim().max(255).optional(),
    notes: z.string().trim().max(500).optional(),
});

export const recoveryIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const assignRecoveryIdentitySchema = z.object({
    designId: z.number().int().positive(),
    colorVariantId: z.number().int().positive(),
    rackId: z.number().int().positive().optional(),
    supervisorName: z.string().trim().min(1, "supervisorName is required").max(100),
    acknowledged: z.boolean().refine((value) => value === true, { message: "acknowledged must be true" }),
    claimShortCode: z.string().trim().min(1).optional(),
});

// --- QR Center: jobs -----------------------------------------------------

export const listJobsQuerySchema = z.object({
    status: z.enum(["COMPLETED", "JAMMED", "QUEUED_OFFLINE", "COMPLETED_UNVERIFIED"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const jobIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const reprintRangeSchema = z.object({
    fromSeq: z.number().int().positive(),
    toSeq: z.number().int().positive(),
}).refine((data) => data.toSeq >= data.fromSeq, { message: "toSeq must be >= fromSeq", path: ["toSeq"] });

// --- QR Center: break-set -----------------------------------------------------

export const breakSetSchema = z.object({
    stockItemId: z.number().int().positive(),
    reasonCode: z.string().trim().min(1, "reasonCode is required").max(50),
    note: z.string().trim().max(500).optional(),
});

// --- QR Center: bulk generators -----------------------------------------------------

export const BULK_KINDS = ["migration-run", "rack-bin-labels", "rebag-rack", "tour-manifest", "void-labels"];

export const bulkKindParamsSchema = z.object({
    kind: z.enum(BULK_KINDS),
});

// Body shape depends on `kind` (see QR_CENTER_API_CONTRACT.md §9) — validated per-field as a
// superset schema (every field optional) rather than five separate routes, since the route
// itself is dynamic (`/bulk/:kind`); qrCenter.service.js#runBulkGenerator re-checks which fields
// are actually required for the given kind and 400s if missing.
export const bulkGeneratorBodySchema = z.object({
    printerId: z.number().int().positive().optional(),
    rackId: z.number().int().positive().optional(),
    stockItemIds: z.array(z.number().int().positive()).optional(),
    stockInTransactionId: z.number().int().positive().optional(),
});

// --- QR Center: print-check -----------------------------------------------------

export const printCheckSchema = z.object({
    stockItemQrIds: z.array(z.number().int().positive()).min(1),
});

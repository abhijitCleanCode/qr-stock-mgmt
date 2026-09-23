import qrCenterController from "../controllers/qrCenter.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import {
    generateQrSchema,
    getRegistrationDetailParamsSchema,
    getTransformationDetailParamsSchema,
    listQrCenterQuerySchema,
    resolveQuerySchema,
    toTagQuerySchema,
    listReprintsQuerySchema,
    createReprintSchema,
    bulkPrintReprintsSchema,
    staleReprintSchema,
    staleAcceptSchema,
    listRecoveryQuerySchema,
    createRecoverySchema,
    recoveryIdParamsSchema,
    assignRecoveryIdentitySchema,
    listJobsQuerySchema,
    jobIdParamsSchema,
    reprintRangeSchema,
    breakSetSchema,
    bulkKindParamsSchema,
    bulkGeneratorBodySchema,
    printCheckSchema,
    searchTagsQuerySchema,
    printBatchQueueSchema,
} from "../validators/qrCenter.validator.js";

export const qrCenterRoutes = [
    {
        path: "",
        controller: { get: qrCenterController.list },
        validators: { get: validateRequest(listQrCenterQuerySchema, "query") },
    },
    {
        path: "/generate",
        controller: { post: qrCenterController.generate },
        validators: { post: validateRequest(generateQrSchema) },
    },

    // --- QR Center (resolve/health/to-tag/reprints/stale/recovery/jobs/break-set/bulk/print-check/reference) ---
    // All fixed single-segment paths below MUST be registered before the legacy
    // "/:stockInTransactionId" catch-all further down, or Express would treat them as its param.
    {
        path: "/tags",
        controller: { get: qrCenterController.searchTags },
        validators: { get: validateRequest(searchTagsQuerySchema, "query") },
    },
    {
        path: "/resolve",
        controller: { get: qrCenterController.resolve },
        validators: { get: validateRequest(resolveQuerySchema, "query") },
    },
    {
        path: "/health",
        controller: { get: qrCenterController.health },
    },
    {
        path: "/to-tag",
        controller: { get: qrCenterController.listToTag },
        validators: { get: validateRequest(toTagQuerySchema, "query") },
    },
    {
        path: "/reprints",
        controller: { get: qrCenterController.listReprints, post: qrCenterController.createReprint },
        validators: { get: validateRequest(listReprintsQuerySchema, "query"), post: validateRequest(createReprintSchema) },
    },
    {
        path: "/reprints/bulk-print",
        controller: { post: qrCenterController.bulkPrintReprints },
        validators: { post: validateRequest(bulkPrintReprintsSchema) },
    },
    {
        path: "/stale",
        controller: { get: qrCenterController.listStale },
    },
    {
        path: "/stale/reprint",
        controller: { post: qrCenterController.staleReprint },
        validators: { post: validateRequest(staleReprintSchema) },
    },
    {
        path: "/stale/accept",
        controller: { post: qrCenterController.staleAccept },
        validators: { post: validateRequest(staleAcceptSchema) },
    },
    {
        path: "/recovery",
        controller: { get: qrCenterController.listRecovery, post: qrCenterController.createRecovery },
        validators: { get: validateRequest(listRecoveryQuerySchema, "query"), post: validateRequest(createRecoverySchema) },
    },
    {
        path: "/recovery/:id/assign-identity",
        controller: { post: qrCenterController.assignRecoveryIdentity },
        validators: { post: [validateRequest(recoveryIdParamsSchema, "params"), validateRequest(assignRecoveryIdentitySchema)] },
    },
    {
        path: "/jobs",
        controller: { get: qrCenterController.listJobs },
        validators: { get: validateRequest(listJobsQuerySchema, "query") },
    },
    {
        path: "/jobs/:id/reprint-range",
        controller: { post: qrCenterController.reprintJobRange },
        validators: { post: [validateRequest(jobIdParamsSchema, "params"), validateRequest(reprintRangeSchema)] },
    },
    {
        path: "/jobs/:id/verify-sample",
        controller: { post: qrCenterController.verifyJobSample },
        validators: { post: validateRequest(jobIdParamsSchema, "params") },
    },
    {
        path: "/break-set",
        controller: { post: qrCenterController.breakSet },
        validators: { post: validateRequest(breakSetSchema) },
    },
    {
        path: "/bulk/:kind",
        controller: { post: qrCenterController.runBulkGenerator },
        validators: { post: [validateRequest(bulkKindParamsSchema, "params"), validateRequest(bulkGeneratorBodySchema)] },
    },
    {
        path: "/print-check",
        controller: { post: qrCenterController.printCheck },
        validators: { post: validateRequest(printCheckSchema) },
    },
    {
        path: "/reference",
        controller: { get: qrCenterController.reference },
    },

    {
        path: "/transformation/:transformationId",
        controller: { get: qrCenterController.getTransformationDetail },
        validators: { get: validateRequest(getTransformationDetailParamsSchema, "params") },
    },
    {
        path: "/:stockInTransactionId/queue",
        controller: { get: qrCenterController.getBatchQueue },
        validators: { get: validateRequest(getRegistrationDetailParamsSchema, "params") },
    },
    {
        path: "/:stockInTransactionId/queue/print",
        controller: { post: qrCenterController.printBatchQueue },
        validators: { post: [validateRequest(getRegistrationDetailParamsSchema, "params"), validateRequest(printBatchQueueSchema)] },
    },
    {
        path: "/:stockInTransactionId",
        controller: { get: qrCenterController.getDetail },
        validators: { get: validateRequest(getRegistrationDetailParamsSchema, "params") },
    },
];

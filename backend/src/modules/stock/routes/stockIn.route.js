import stockInController from "../controllers/stockIn.controller.js";
import stockInDraftController from "../controllers/stockInDraft.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { stockInDraftIdParamsSchema, stockInDraftSchema, stockInSchema } from "../validators/stockIn.validator.js";

export const stockInRoutes = [
    {
        path: "",
        controller: {
            post: stockInController.registerStockIn,
        },
        validators: {
            post: validateRequest(stockInSchema),
        },
    },
    {
        path: "/dashboard",
        controller: { get: stockInDraftController.getDashboard },
    },
    {
        path: "/drafts",
        controller: { get: stockInDraftController.listDrafts, post: stockInDraftController.createDraft },
        validators: { post: validateRequest(stockInDraftSchema) },
    },
    {
        path: "/drafts/:id",
        controller: {
            get: stockInDraftController.getDraft,
            put: stockInDraftController.updateDraft,
            delete: stockInDraftController.deleteDraft,
        },
        validators: {
            get: validateRequest(stockInDraftIdParamsSchema, "params"),
            put: [validateRequest(stockInDraftIdParamsSchema, "params"), validateRequest(stockInDraftSchema)],
            delete: validateRequest(stockInDraftIdParamsSchema, "params"),
        },
    },
];

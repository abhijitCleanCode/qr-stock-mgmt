import currentStockController from "../controllers/currentStock.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { listCurrentStockQuerySchema } from "../validators/currentStock.validator.js";

export const currentStockRoutes = [
    {
        path: "",
        controller: {
            get: currentStockController.getCurrentStockSummary,
        },
        validators: {
            get: validateRequest(listCurrentStockQuerySchema, "query"),
        },
    },
];

import stockInController from "../controllers/stockIn.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { stockInSchema } from "../validators/stockIn.validator.js";

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
];

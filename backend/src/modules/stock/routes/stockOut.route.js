import stockOutController from "../controllers/stockOut.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { stockOutSchema } from "../validators/stockOut.validator.js";

export const stockOutRoutes = [
    {
        path: "",
        controller: {
            post: stockOutController.registerStockOut,
        },
        validators: {
            post: validateRequest(stockOutSchema),
        },
    },
];

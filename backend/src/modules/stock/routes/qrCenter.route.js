import qrCenterController from "../controllers/qrCenter.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { generateQrSchema, getRegistrationDetailParamsSchema, listQrCenterQuerySchema } from "../validators/qrCenter.validator.js";

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
    {
        path: "/:stockInTransactionId",
        controller: { get: qrCenterController.getDetail },
        validators: { get: validateRequest(getRegistrationDetailParamsSchema, "params") },
    },
];

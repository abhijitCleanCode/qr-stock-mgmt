import orderFormController from "../controllers/orderForm.controller.js";
import orderFormPhotoController from "../controllers/orderFormPhoto.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { imageUpload } from "../../../app/middlewares/multer.middleware.js";
import {
    createOrderFormSchema,
    listOrderFormsQuerySchema,
    orderFormIdParamsSchema,
    updateOrderFormSchema,
    updateOrderFormStatusSchema,
} from "../validators/orderForm.validator.js";
import {
    orderFormNumberParamsSchema,
    orderFormPhotoParamsSchema,
} from "../validators/orderFormPhoto.validator.js";

// Client contract: gallery uploads are sent under the repeated "photos" field.
const MAX_GALLERY_PHOTOS = 30;

export const orderFormRoutes = [
    {
        path: "",
        controller: {
            get: orderFormController.listOrderForms,
            post: orderFormController.createOrderForm,
        },
        validators: {
            get: validateRequest(listOrderFormsQuerySchema, "query"),
            post: validateRequest(createOrderFormSchema),
        },
    },
    {
        path: "/:id",
        controller: {
            get: orderFormController.getOrderFormDetail,
            put: orderFormController.updateOrderForm,
        },
        validators: {
            get: validateRequest(orderFormIdParamsSchema, "params"),
            put: validateRequest(orderFormIdParamsSchema, "params"),
        },
        middlewares: {
            put: [validateRequest(updateOrderFormSchema)],
        },
    },
    {
        path: "/:id/status",
        controller: {
            patch: orderFormController.updateStatus,
        },
        validators: {
            patch: validateRequest(orderFormIdParamsSchema, "params"),
        },
        middlewares: {
            patch: [validateRequest(updateOrderFormStatusSchema)],
        },
    },
    {
        path: "/share/:orderFormNumber",
        controller: {
            get: orderFormPhotoController.getSharedOrderForm,
        },
        validators: {
            get: validateRequest(orderFormNumberParamsSchema, "params"),
        },
    },
    {
        path: "/:id/photos",
        controller: {
            get: orderFormPhotoController.listPhotos,
            post: orderFormPhotoController.uploadPhotos,
        },
        validators: {
            get: validateRequest(orderFormIdParamsSchema, "params"),
            post: validateRequest(orderFormIdParamsSchema, "params"),
        },
        middlewares: {
            post: [imageUpload.array("photos", MAX_GALLERY_PHOTOS)],
        },
    },
    {
        path: "/:id/photos/download-all",
        controller: {
            get: orderFormPhotoController.getDownloadAllUrl,
        },
        validators: {
            get: validateRequest(orderFormIdParamsSchema, "params"),
        },
    },
    {
        path: "/:id/photos/:photoId",
        controller: {
            delete: orderFormPhotoController.deletePhoto,
        },
        validators: {
            delete: validateRequest(orderFormPhotoParamsSchema, "params"),
        },
    },
];

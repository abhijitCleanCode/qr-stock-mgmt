import upload from "../../../app/middlewares/multer.middleware.js";
import designController from "../controllers/design.controller.js";
import { validateRequest } from "../../../core/validateRequest.js";
import { colorVariantSizesParamsSchema, listDesignsQuerySchema, registerDesignSchema, searchDesignsQuerySchema } from "../validators/design.validator.js";

// Client contract: files are sent under the repeated "images" field, and the Nth file
// corresponds to the Nth entry in colorVariants — one image per variant, in matching order.
const MAX_VARIANT_IMAGES = 20;

export const designRoutes = [
    {
        path: "/search",
        controller: {
            get: designController.searchDesign
        },
        validators: {
            get: validateRequest(searchDesignsQuerySchema, "query")
        }
    },
    {
        path: "",
        controller: {
            get: designController.getAllDesigns,
            post: designController.RegisterDesign
        },
        middlewares: {
            post: [
                upload.array("images", MAX_VARIANT_IMAGES)
            ]
        },
        validators: {
            get: validateRequest(listDesignsQuerySchema, "query"),
            post: validateRequest(registerDesignSchema)
        }
    },
    {
        path: "/color-variants/:colorVariantId/sizes",
        controller: {
            get: designController.getActiveVariantSizes
        },
        validators: {
            get: validateRequest(colorVariantSizesParamsSchema, "params")
        }
    }
]

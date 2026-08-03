import designController from "../controllers/design.controller.js";

export const designRoutes = [
    {
        path: "",
        controller: {
            post: designController.RegisterDesign
        },
    }
]

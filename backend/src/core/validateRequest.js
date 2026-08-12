import ApiError from "./apiError.js";

// Express middleware factory: validates req.body against a Zod schema.
// On success, req.body is replaced with the parsed (defaulted/coerced) data.
export const validateRequest = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const message = result.error.issues
            .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
            .join("; ");

        return next(new ApiError(message, 400, "VALIDATION_ERROR"));
    }

    req.body = result.data;
    next();
};

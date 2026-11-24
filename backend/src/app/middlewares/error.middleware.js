import ApiError from '../../core/apiError.js';
import logger from '../../config/logger.js';
import {TRACE_ID_HEADER} from "./trace.middleware.js";
import { isTransientDbError } from "../../core/resilience.js";

const isDev = process.env.NODE_ENV === "development";

const READ_METHODS = new Set(["GET", "HEAD"]);

// A dropped connection is not a bug in the request, so it gets a 503 rather than a generic 500.
// The message depends on the method: a read can simply be repeated, but a save may already have
// happened before the connection dropped, so the user is told to check before trying again.
function transientDbError(method) {
    if (READ_METHODS.has(method)) {
        return new ApiError("The database is busy. Please try again in a moment.", 503, "DB_UNAVAILABLE");
    }
    return new ApiError(
        "The connection dropped while saving. The change may or may not have been saved. Check the list before trying again.",
        503,
        "SAVE_INTERRUPTED",
    );
}

export function parseDbError(error, method = "GET") {
    if (isTransientDbError(error)) return transientDbError(method);

    const cause = error?.cause || error?.originalError?.cause;

    if (!cause) return null;

    if (cause.code === "23505") {
        return new ApiError(
            cause.detail || "Duplicate value violates unique constraint",
            409,
            "DUPLICATE_RESOURCE"
        );
    }

    if (cause.code === "23502") {
        return new ApiError(
            cause.column + " cannot be null",
            400,
            "NOT_NULL_VIOLATION"
        );
    }

    if (cause.code === "23503") {
        return new ApiError(
            "Referenced resource does not exist",
            400,
            "FOREIGN_KEY_VIOLATION"
        );
    }

    return null;
}

const errorHandler = (err, req, res, next) => {
    // Drizzle wraps database failures as "Failed query: <sql>". The real reason (connection closed,
    // timeout, constraint, ...) is on err.cause, so keep it for the log.
    const dbCause = err?.cause ? { message: err.cause.message, code: err.cause.code, detail: err.cause.detail } : undefined;

    const dbError = parseDbError(err, req.method);

    if (dbError) {
        err = dbError;
    }

    // An error that isn't an ApiError is unexpected. Its message can contain the SQL text (Drizzle
    // puts the query in it), so the browser gets a generic message and the full error goes to the log.
    const unexpected = !(err instanceof ApiError);
    const original = err;
    if (unexpected) {
        err = new ApiError("Something went wrong on the server. Please try again.", 500, "INTERNAL_ERROR", false);
    }

    const statusCode = err.statusCode || 500;
    const traceId = req.traceId || req.headers[TRACE_ID_HEADER];

    // logging
    const isMissingStockInDraft =
        statusCode === 404 &&
        req.method === 'GET' &&
        /\/stock-in\/drafts\/\d+$/.test(req.originalUrl);

    const logError = isMissingStockInDraft ? logger.warn.bind(logger) : logger.error.bind(logger);
    logError({
        err: unexpected ? original : err,
        dbCause,
        traceId,
        path: req.originalUrl,
        method: req.method,
    }, isMissingStockInDraft ? "Stock In draft no longer exists." : "Request failed");

    const response = {
        error: {
            code: err.code,
            message: err.message,
            traceId,
            timestamp: new Date().toISOString(),
        },
    };

    // dev debugging info
    // Development only. An unexpected error's stack and message contain the SQL text, so for those
    // only the database's error code and the constraint, table and column names are shown.
    if (isDev) {
        const driverError = (unexpected ? original : err.originalError)?.cause;
        response.error.debug = {
            ...(unexpected ? {} : { stack: err.stack }),
            postgres: driverError
                ? {
                    code: driverError.code,
                    constraint: driverError.constraint,
                    table: driverError.table,
                    column: driverError.column,
                }
                : undefined,
        };
    }

    res.status(statusCode).json(response);
};

export default errorHandler;

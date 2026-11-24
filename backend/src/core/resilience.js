import logger from "../config/logger.js";

// Database failures that mean "the connection dropped or never came up". The same statement
// usually succeeds a moment later (Neon waking from idle, a network blip). Constraint and SQL
// errors are not transient and are never retried.
const TRANSIENT_CODES = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "EPIPE",
    "ECONNREFUSED",
    "57P01", // admin shutdown
    "57P02", // crash shutdown
    "57P03", // cannot connect now
    "08000", // connection exception
    "08001", // unable to establish connection
    "08003", // connection does not exist
    "08004", // server rejected the connection
    "08006", // connection failure
]);
const TRANSIENT_MESSAGE = /connection (terminated|timeout|reset|closed|error)|timeout exceeded when trying to connect|client has encountered a connection error|terminating connection/i;

// Drizzle wraps the driver's error as `cause`, and its own message contains the SQL text. Only the
// driver's error is inspected, so SQL text can never be mistaken for a connection failure.
export function isTransientDbError(error) {
    const driverError = error?.cause ?? error;
    if (!driverError) return false;
    return TRANSIENT_CODES.has(driverError.code) || TRANSIENT_MESSAGE.test(driverError.message ?? "");
}

// A failure that arrives quickly is a dropped connection, worth one more attempt. A slow one has
// already waited out the pool's connection timeout, and repeating it would double the user's wait.
export const FAST_FAILURE_MS = 3000;
const RETRY_DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs a READ-ONLY operation again, once, after a quick connection drop. Never use this for
// writes: a write that failed mid-way may already have been applied.
export async function retryReads(operation, { label = "read", fastFailureMs = FAST_FAILURE_MS } = {}) {
    const started = performance.now();
    try {
        return await operation();
    } catch (error) {
        const elapsedMs = performance.now() - started;
        if (!isTransientDbError(error) || elapsedMs > fastFailureMs) throw error;

        logger.warn({ err: error.cause ?? error, label, elapsedMs: Math.round(elapsedMs) }, "Transient database error, retrying read once");
        await sleep(RETRY_DELAY_MS);
        return operation();
    }
}

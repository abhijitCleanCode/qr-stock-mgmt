import { timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import { pool } from "../database/connection.js";
import { isTransientDbError } from "./resilience.js";

// A health probe must answer quickly even when the pool is saturated, so waiting for a connection
// is capped here. The pool's own connection timeout is much longer and suits ordinary requests.
const CONNECT_TIMEOUT_MS = 5000;

const elapsed = (start) => Math.round(performance.now() - start);

// Gets a pooled connection, but gives up after CONNECT_TIMEOUT_MS. A connection that arrives after
// the caller has given up is released straight back to the pool, so none is leaked.
function connectWithin(timeoutMs) {
    let timedOut = false;
    let timer;
    const attempt = pool.connect();
    attempt.then((client) => {
        if (timedOut) client.release();
    }, () => {});

    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            timedOut = true;
            const error = new Error("Timed out waiting for a database connection.");
            error.code = "HEALTH_CONNECT_TIMEOUT";
            reject(error);
        }, timeoutMs);
    });

    return Promise.race([attempt, deadline]).finally(() => clearTimeout(timer));
}

// Constant-time comparison, so the token cannot be guessed by timing the response.
function tokenMatches(provided) {
    if (!env.HEALTH_TOKEN || typeof provided !== "string") return false;
    const expected = Buffer.from(env.HEALTH_TOKEN);
    const given = Buffer.from(provided);
    return given.length === expected.length && timingSafeEqual(given, expected);
}

function poolFigures() {
    return { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
}

// GET /health/db. Checks that the database answers, using one connection and `select 1`. It reads
// and writes no application data. Callers without the HEALTH_TOKEN get only ok or unavailable;
// callers with it also get timings and pool figures, which show whether a slow answer is the
// database or the application. Driver internals and the connection string are never returned.
export async function dbHealth(req, res) {
    const detailed = tokenMatches(req.get("x-health-token"));
    const started = performance.now();
    let acquireMs = null;
    let client;

    try {
        const acquireStart = performance.now();
        client = await connectWithin(CONNECT_TIMEOUT_MS);
        acquireMs = elapsed(acquireStart);

        const queryStart = performance.now();
        await client.query("select 1");
        const body = { status: "ok" };
        if (detailed) {
            Object.assign(body, {
                acquireMs,
                queryMs: elapsed(queryStart),
                totalMs: elapsed(started),
                pool: poolFigures(),
                checkedAt: new Date().toISOString(),
            });
        }
        return res.status(200).json(body);
    } catch (error) {
        const body = { status: "unavailable" };
        if (detailed) {
            Object.assign(body, {
                reason: error.code === "HEALTH_CONNECT_TIMEOUT" ? "pool-timeout" : isTransientDbError(error) ? "connection" : "query",
                code: error.cause?.code ?? error.code ?? null,
                acquireMs,
                totalMs: elapsed(started),
                pool: poolFigures(),
                checkedAt: new Date().toISOString(),
            });
        }
        return res.status(503).json(body);
    } finally {
        client?.release();
    }
}

import { Pool } from "pg";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

// configure pool for performance
export const pool = new Pool({
    connectionString: env.DATABASE_URL,

    max: env.DB_POOL_SIZE,
    // close idle connection after 10 sec to free resources
    idleTimeoutMillis: 30000,
    // timeout connecting if DB is unresponsive (fail fast)
    connectionTimeoutMillis: 10000,
    // keep the connection alive to prevent the network layer from dropping it
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});

// pool lifecycle logs
logger.info({ maxConnections: env.DB_POOL_SIZE }, "PostgreSQL pool configured");

// handle Pool Errors, crucial for stability
pool.on('error', (err, client) => {
    logger.error({
            err,
            component: "db-pool",
        }, "Unexpected error on idle PostgresSQL client"
    );
});

export async function verifyConnection() {
    const client = await pool.connect(); // will throw if DB unreachable
    try {
        await client.query("SELECT 1");
        logger.info("PostgreSQL connection verified");
    } finally {
        client.release(); // always release back to pool
    }
}

// graceful shutdown helper
export async function closePool () {
    try {
        logger.info("Closing PostgresSQL connection pool");
        await pool.end();
        logger.info("Database pool closed successfully!");
    } catch (err) {
        logger.error({err, component: "db-pool"}, "Error closing PostgresSQL pool");
        throw err; // let server.js shutdown() handle exit(1)
    }
}

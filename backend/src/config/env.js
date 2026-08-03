// validates every env var at startup. Preventing no silent misconfiguration.
import "dotenv/config.js";

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default("development"),
    PORT: z.string().default('8001').transform(Number),

    DATABASE_URL: z.string(),
    DB_POOL_SIZE: z.string().default("10").transform(Number),

    // logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SERVICE_NAME: z.string().default('stock-mgmt-backend'),
    SERVICE_VERSION: z.string().default('v1'),
})

// reusable
function validateEnv(schema) {
    // safeparse: to format errors cleanly
    const result = schema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ Invalid environment variables:");

        result.error.errors.forEach((err) => {
            const path = err.path.join('.');
            console.error(`  ${path}: ${err.message}`);
        });

        process.exit(1);
    }

    return result.data;
}

export const env = validateEnv(envSchema);

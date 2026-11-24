// validates every env var at startup. Preventing no silent misconfiguration.
import "dotenv/config.js";

import { z } from "zod";

const envSchema = z.object({
    // 'test' is what vitest sets; without it the whole suite exits 1 before a test runs.
    NODE_ENV: z.enum(['development', 'production', 'test']).default("development"),
    PORT: z.string().default('8001').transform(Number),

    DATABASE_URL: z.string(),
    DB_POOL_SIZE: z.string().default("10").transform(Number),

    CLOUDINARY_CLOUD_NAME: z.string(),
    CLOUDINARY_API_KEY: z.string(),
    CLOUDINARY_API_SECRET: z.string(),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SERVICE_NAME: z.string().default('stock-mgmt-backend'),
    SERVICE_VERSION: z.string().default('v1'),

    // Optional. When set, GET /health/db returns its timings and pool figures only to callers that
    // send it in the X-Health-Token header. Without it, the endpoint reports just ok or unavailable.
    HEALTH_TOKEN: z.string().min(16, "HEALTH_TOKEN must be at least 16 characters.").optional(),
})

// reusable
function validateEnv(schema) {
    // safeparse: to format errors cleanly
    const result = schema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ Invalid environment variables:");

        result.error.issues.forEach((err) => {
            const path = err.path.join('.');
            console.error(`  ${path}: ${err.message}`);
        });

        process.exit(1);
    }

    return result.data;
}

export const env = validateEnv(envSchema);

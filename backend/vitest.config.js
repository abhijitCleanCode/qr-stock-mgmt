import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // Every suite talks to the same Postgres database and truncates between tests, so
        // parallel files would delete each other's rows mid-assertion.
        fileParallelism: false,
        setupFiles: ["./tests/helpers/env.js"],
        include: ["tests/**/*.test.js"],
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});

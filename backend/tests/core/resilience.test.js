import { describe, expect, it, vi } from "vitest";

import { isTransientDbError, retryReads } from "../../src/core/resilience.js";

// Shapes match what drizzle + node-postgres throw: a wrapper whose `cause` is the driver error.
const droppedConnection = () => Object.assign(new Error("Failed query: select 1 params: 24"), {
    cause: Object.assign(new Error("Connection terminated due to connection timeout"), { code: undefined }),
});
const constraintError = () => Object.assign(new Error("Failed query: insert into designs"), {
    cause: Object.assign(new Error('duplicate key value violates unique constraint "designs_code_key"'), { code: "23505" }),
});

describe("isTransientDbError", () => {
    it("recognises a dropped or timed-out connection behind the drizzle wrapper", () => {
        expect(isTransientDbError(droppedConnection())).toBe(true);
    });

    it("recognises connection error codes", () => {
        expect(isTransientDbError({ code: "ECONNRESET" })).toBe(true);
        expect(isTransientDbError({ cause: { code: "08006" } })).toBe(true);
        expect(isTransientDbError({ cause: { code: "57P01" } })).toBe(true);
    });

    it("does not treat constraint and SQL errors as transient", () => {
        expect(isTransientDbError(constraintError())).toBe(false);
        expect(isTransientDbError(new Error("column x does not exist"))).toBe(false);
        expect(isTransientDbError(undefined)).toBe(false);
    });

    it("ignores SQL text in the wrapper message: only the driver's error counts", () => {
        const wrapper = Object.assign(new Error('Failed query: select * from notes where body = \'connection terminated\''), {
            cause: Object.assign(new Error("column does not exist"), { code: "42703" }),
        });
        expect(isTransientDbError(wrapper)).toBe(false);
    });
});

describe("retryReads", () => {
    it("returns the result when the first attempt succeeds", async () => {
        const operation = vi.fn().mockResolvedValue("rows");
        await expect(retryReads(operation)).resolves.toBe("rows");
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries once after a quick connection drop and returns the second result", async () => {
        const operation = vi.fn().mockRejectedValueOnce(droppedConnection()).mockResolvedValueOnce("rows");
        await expect(retryReads(operation, { label: "test" })).resolves.toBe("rows");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("gives up after the single retry and raises the second error", async () => {
        const operation = vi.fn().mockRejectedValue(droppedConnection());
        await expect(retryReads(operation)).rejects.toThrow("Failed query");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("does not retry a slow failure, which has already waited out the connection timeout", async () => {
        const operation = vi.fn().mockRejectedValue(droppedConnection());
        await expect(retryReads(operation, { fastFailureMs: -1 })).rejects.toThrow("Failed query");
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("never retries a logic error", async () => {
        const operation = vi.fn().mockRejectedValue(constraintError());
        await expect(retryReads(operation)).rejects.toThrow("Failed query");
        expect(operation).toHaveBeenCalledTimes(1);
    });
});

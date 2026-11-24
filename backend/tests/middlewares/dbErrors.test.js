import { describe, expect, it } from "vitest";
import ApiError from "../../src/core/apiError.js";
import errorHandler from "../../src/app/middlewares/error.middleware.js";

import { parseDbError } from "../../src/app/middlewares/error.middleware.js";

const dropped = () => Object.assign(new Error("Failed query: update designs"), {
    cause: Object.assign(new Error("Connection terminated unexpectedly"), {}),
});

describe("parseDbError for a dropped connection", () => {
    it("tells the user to try again when the failed request was a read", () => {
        const error = parseDbError(dropped(), "GET");
        expect(error.statusCode).toBe(503);
        expect(error.code).toBe("DB_UNAVAILABLE");
    });

    it("warns that a save may have happened when the failed request was a write", () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            const error = parseDbError(dropped(), method);
            expect(error.statusCode).toBe(503);
            expect(error.code).toBe("SAVE_INTERRUPTED");
            expect(error.message).toMatch(/may or may not have been saved/);
        }
    });
});

describe("parseDbError for constraint errors", () => {
    it("keeps the duplicate-value mapping unchanged", () => {
        const error = parseDbError(Object.assign(new Error("Failed query"), {
            cause: Object.assign(new Error("duplicate"), { code: "23505", detail: "Key (code)=(kp1) already exists." }),
        }), "POST");
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe("DUPLICATE_RESOURCE");
    });

    it("returns null for errors that are not database errors", () => {
        expect(parseDbError(new Error("boom"), "GET")).toBeNull();
    });
});

describe("errorHandler response for unexpected errors", () => {
    const run = (err, method = "GET") => {
        const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
        errorHandler(err, { method, originalUrl: "/api/v1/designs", headers: {}, traceId: "trace-1" }, res, () => {});
        return res;
    };

    it("never sends SQL text to the browser", () => {
        const err = Object.assign(new Error('Failed query: select "designs"."code" from "designs" where id = $1\nparams: 7'), {
            cause: Object.assign(new Error('syntax error at or near "selec"'), { code: "42601" }),
        });
        const res = run(err);
        const body = JSON.stringify(res.body);
        expect(res.statusCode).toBe(500);
        expect(body).not.toMatch(/select|designs|params:/i);
        expect(res.body.error.message).toBe("Something went wrong on the server. Please try again.");
        expect(res.body.error.traceId).toBe("trace-1");
    });

    it("keeps the message of a deliberate ApiError", () => {
        const res = run(new ApiError("Design 7 not found.", 404, "DESIGN_NOT_FOUND"));
        expect(res.statusCode).toBe(404);
        expect(res.body.error.message).toBe("Design 7 not found.");
    });
});

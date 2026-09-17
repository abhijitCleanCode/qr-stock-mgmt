import crypto from "crypto";

// Uppercase, visually-unambiguous alphabet (no 0/O, 1/I) — a worker retyping a code off a
// printed label shouldn't be able to confuse characters. 6 chars over a 32-symbol alphabet is
// ~1.07 billion combinations, comfortably enough for the retry-on-collision loop below to never
// realistically exhaust in this app's volume.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;
const MAX_ATTEMPTS = 20;

export function generateShortCode() {
    const bytes = crypto.randomBytes(LENGTH);
    let code = "";
    for (let i = 0; i < LENGTH; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return code;
}

// Collision-checked, not collision-enforced (see stockItemQr.schema.js's shortCode comment —
// there is deliberately no unique constraint). `existsFn(code)` is caller-supplied so this stays
// runner-agnostic (tx vs db); throws rather than silently minting a colliding code if the
// (astronomically unlikely) retry budget is exhausted.
export async function generateUniqueShortCode(existsFn) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const code = generateShortCode();
        if (!(await existsFn(code))) return code;
    }
    throw new Error("Could not generate a unique QR short code after multiple attempts.");
}

import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { design } from "../schemas/design.schema.js";

// trim + lowercase, so "MB204", "mb204" and " MB204 " all resolve to the same design code.
// Blank/absent code normalizes to null — designs without a code aren't deduplicated (mirrors
// the unique index, which treats each NULL normalizedCode as distinct).
export const normalizeDesignCode = (code) => {
    const trimmed = code?.trim();
    return trimmed ? trimmed.toLowerCase() : null;
};

class DesignRepository {
    async create(tx, data) {
        const [result] = await tx.insert(design).values(data).returning();

        return result;
    }

    // Identity lookup backing the upsert in DesignService.registerDesign — same pattern +
    // same code is the same design. normalizedCode === null never matches (mirrors the unique
    // index, which treats each NULL normalizedCode as distinct), so codeless designs always
    // create a new row.
    async findByIdentity(tx, { patternId, normalizedCode }) {
        if (!normalizedCode) return undefined;

        const [result] = await tx
            .select()
            .from(design)
            .where(and(eq(design.patternId, patternId), eq(design.normalizedCode, normalizedCode)))
            .limit(1);

        return result;
    }

    // Race-safe create for the case findByIdentity found nothing: if another concurrent request
    // creates the same (patternId, normalizedCode) design first, the unique index rejects this
    // insert (onConflictDoNothing) and we fall back to reading the row it just committed —
    // mirrors patternRepository.findOrCreate. Skipped for codeless designs, which can't conflict.
    async createOrFindExisting(tx, data) {
        if (!data.normalizedCode) {
            const row = await this.create(tx, data);
            return { row, wasCreated: true };
        }

        const [inserted] = await tx
            .insert(design)
            .values(data)
            .onConflictDoNothing({ target: [design.patternId, design.normalizedCode] })
            .returning();

        if (inserted) return { row: inserted, wasCreated: true };

        const existing = await this.findByIdentity(tx, { patternId: data.patternId, normalizedCode: data.normalizedCode });
        return { row: existing, wasCreated: false };
    }

    // Merges newly submitted scalar fields into an existing design (see DesignService.registerDesign).
    // Only fields with an intended "latest submission wins" update convention are touched;
    // list-based fields (colours/sizes) are merged separately by the caller.
    async update(tx, id, data) {
        const [result] = await tx
            .update(design)
            .set(data)
            .where(eq(design.id, id))
            .returning();

        return result;
    }

    async findAll({ limit, offset }) {
        return db
            .select()
            .from(design)
            .orderBy(desc(design.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async count() {
        const [result] = await db.select({ value: count() }).from(design);

        return result.value;
    }

    async findById(tx, id) {
        const [result] = await tx.select().from(design).where(eq(design.id, id)).limit(1);
        return result;
    }

    async search(keyword) {
        return await db
            .select({
                id: design.id,
                code: design.code,
                name: design.name,
                defaultSellingPricePerPiece: design.defaultSellingPricePerPiece,
            })
            .from(design)
            .where(or(ilike(design.code, `%${keyword}%`), ilike(design.name, `%${keyword}%`)))
            .limit(20);
    }
}

export default new DesignRepository();

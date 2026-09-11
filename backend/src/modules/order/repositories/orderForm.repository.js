import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../../../database/index.js";
import { orderForm } from "../schemas/orderForm.schema.js";

// "OF-000158" -> 158. Returns null for anything that doesn't contain a number, so a keyword
// search can fall back to matching retailer/contact/location text instead.
function extractOrderFormId(keyword) {
    const digits = keyword.replace(/\D/g, "");
    return digits ? Number(digits) : null;
}

function buildFilters({ status, keyword }) {
    const conditions = [];

    if (status) conditions.push(eq(orderForm.status, status));

    if (keyword) {
        const keywordConditions = [
            ilike(orderForm.retailerName, `%${keyword}%`),
            ilike(orderForm.contactPerson, `%${keyword}%`),
            ilike(orderForm.location, `%${keyword}%`),
        ];

        const idFromKeyword = extractOrderFormId(keyword);
        if (idFromKeyword) keywordConditions.push(eq(orderForm.id, idFromKeyword));

        conditions.push(or(...keywordConditions));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
}

class OrderFormRepository {
    async create(tx, data) {
        const [result] = await tx.insert(orderForm).values(data).returning();

        return result;
    }

    async update(tx, id, data) {
        const [result] = await tx.update(orderForm)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(orderForm.id, id))
            .returning();

        return result;
    }

    async updateStatus(tx, id, status) {
        const [result] = await tx.update(orderForm)
            .set({ status, updatedAt: new Date() })
            .where(eq(orderForm.id, id))
            .returning();

        return result;
    }

    async findById(runner, id) {
        const [result] = await runner.select().from(orderForm).where(eq(orderForm.id, id)).limit(1);

        return result;
    }

    async findMany(runner, { limit, offset, status, keyword }) {
        return runner.select().from(orderForm)
            .where(buildFilters({ status, keyword }))
            .orderBy(desc(orderForm.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async count(runner, { status, keyword }) {
        const [result] = await runner.select({ value: count() }).from(orderForm)
            .where(buildFilters({ status, keyword }));

        return result.value;
    }

    // Grouped counts for the status tabs (All / Draft / Shared / Converted / Cancelled) in one
    // query rather than one count() per tab.
    async countByStatus(runner) {
        return runner.select({
            status: orderForm.status,
            value: sql`count(*)`.mapWith(Number),
        }).from(orderForm).groupBy(orderForm.status);
    }
}

export default new OrderFormRepository();

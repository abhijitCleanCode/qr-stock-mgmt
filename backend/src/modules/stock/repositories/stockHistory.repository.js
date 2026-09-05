import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { stockHistory } from "../schemas/stockHistory.schema.js";
import { stockInTransaction } from "../schemas/stockInTransaction.schema.js";
import { colorVariant } from "../../design/schemas/colorVariant.schema.js";
import { design } from "../../design/schemas/design.schema.js";

const listColumns = {
    id: stockHistory.id,
    eventType: stockHistory.eventType,
    createdAt: stockHistory.createdAt,
    quantity: stockHistory.quantity,
    metadata: stockHistory.metadata,
    colorVariantId: stockHistory.colorVariantId,
    colorName: colorVariant.colorName,
    colorHex: colorVariant.colorHex,
    designId: design.id,
    designCode: design.code,
    designName: design.name,
    stockInTransactionId: stockHistory.stockInTransactionId,
    stockDate: stockInTransaction.stockDate,
};

// dateFrom/dateTo arrive as plain "YYYY-MM-DD" strings (same convention as
// stockInTransaction.stockDate — see stockIn.validator.js). createdAt is a full timestamp, so a
// bare date-only bound would silently exclude everything after midnight on dateTo; widen both
// ends to the full requested day in UTC so the range is genuinely inclusive.
function startOfDayUtc(dateOnly) {
    return new Date(`${dateOnly}T00:00:00.000Z`);
}

function endOfDayUtc(dateOnly) {
    return new Date(`${dateOnly}T23:59:59.999Z`);
}

function buildFilters({ eventType, colorVariantId, dateFrom, dateTo, keyword }) {
    const conditions = [];

    if (eventType) conditions.push(eq(stockHistory.eventType, eventType));
    if (colorVariantId) conditions.push(eq(stockHistory.colorVariantId, colorVariantId));
    if (dateFrom) conditions.push(gte(stockHistory.createdAt, startOfDayUtc(dateFrom)));
    if (dateTo) conditions.push(lte(stockHistory.createdAt, endOfDayUtc(dateTo)));
    if (keyword) {
        conditions.push(or(
            ilike(design.code, `%${keyword}%`),
            ilike(design.name, `%${keyword}%`),
            ilike(colorVariant.colorName, `%${keyword}%`)
        ));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
}

class StockHistoryRepository {
    // Called only with `tx` from inside the stock-mutation transaction that produced the event
    // (see stockIn.service.js / stockItem.service.js) — never on its own.
    async create(tx, data) {
        const [result] = await tx.insert(stockHistory).values(data).returning();

        return result;
    }

    // `runner` is `db` for reads (this repository never needs a transaction to list history) —
    // same generic-first-arg convention as every other repository in this module.
    async findMany(runner, { limit, offset, eventType, colorVariantId, dateFrom, dateTo, keyword }) {
        return runner.select(listColumns).from(stockHistory)
            .innerJoin(colorVariant, eq(stockHistory.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .leftJoin(stockInTransaction, eq(stockHistory.stockInTransactionId, stockInTransaction.id))
            .where(buildFilters({ eventType, colorVariantId, dateFrom, dateTo, keyword }))
            .orderBy(desc(stockHistory.createdAt), desc(stockHistory.id))
            .limit(limit)
            .offset(offset);
    }

    async count(runner, { eventType, colorVariantId, dateFrom, dateTo, keyword }) {
        const [result] = await runner.select({ value: count() }).from(stockHistory)
            .innerJoin(colorVariant, eq(stockHistory.colorVariantId, colorVariant.id))
            .innerJoin(design, eq(colorVariant.designId, design.id))
            .where(buildFilters({ eventType, colorVariantId, dateFrom, dateTo, keyword }));

        return result.value;
    }
}

export default new StockHistoryRepository();

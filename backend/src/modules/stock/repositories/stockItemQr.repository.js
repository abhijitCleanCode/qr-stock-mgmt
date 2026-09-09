import { desc, eq, inArray } from "drizzle-orm";

import { stockItemQr } from "../schemas/stockItemQr.schema.js";
import { stockItem } from "../schemas/stockItems.schema.js";

class StockItemQrRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(stockItemQr).values(rows).returning();
    }

    // Ordered newest-first so callers picking "the" QR for a stock item (there can be
    // several history rows — see stockItemQr.schema.js) just take the first match per id.
    async findByStockItemIds(tx, stockItemIds) {
        if (stockItemIds.length === 0) return [];

        return tx.select().from(stockItemQr)
            .where(inArray(stockItemQr.stockItemId, stockItemIds))
            .orderBy(desc(stockItemQr.generatedAt));
    }

    // Every QR generated as part of one Stock Registration (stock_in_transaction), for the
    // QR Grid page — joined back to stock_item only for its `type`, which the grid label
    // needs. Newest-first for the same reason as findByStockItemIds: a caller collapsing to
    // one QR per stock item just takes the first match.
    async findByStockInTransactionId(tx, stockInTransactionId) {
        return tx.select({
            stockItemId: stockItemQr.stockItemId,
            payload: stockItemQr.payload,
            generatedAt: stockItemQr.generatedAt,
            type: stockItem.type,
        }).from(stockItemQr)
            .innerJoin(stockItem, eq(stockItemQr.stockItemId, stockItem.id))
            .where(eq(stockItem.stockInTransactionId, stockInTransactionId))
            .orderBy(desc(stockItemQr.generatedAt));
    }
}

export default new StockItemQrRepository();

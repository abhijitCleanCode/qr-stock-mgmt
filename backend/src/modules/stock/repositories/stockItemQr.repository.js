import { desc, inArray } from "drizzle-orm";

import { stockItemQr } from "../schemas/stockItemQr.schema.js";

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
}

export default new StockItemQrRepository();

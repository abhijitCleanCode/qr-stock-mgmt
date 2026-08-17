import { stockItem } from "../schemas/stockItems.schema.js";

class StockItemRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(stockItem).values(rows).returning();
    }
}

export default new StockItemRepository();

import { stockItemQr } from "../schemas/stockItemQR.schema.js";

class StockItemQrRepository {
    async createMany(tx, rows) {
        if (rows.length === 0) return [];

        return tx.insert(stockItemQr).values(rows).returning();
    }
}

export default new StockItemQrRepository();

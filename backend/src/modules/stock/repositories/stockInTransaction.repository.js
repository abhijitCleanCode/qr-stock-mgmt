import { stockInTransaction } from "../schemas/stockInTransaction.schema.js";

class StockInTransactionRepository {
    async create(tx, data) {
        const [result] = await tx.insert(stockInTransaction).values(data).returning();

        return result;
    }
}

export default new StockInTransactionRepository();

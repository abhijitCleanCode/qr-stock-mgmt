import { stockInBundlePiece } from "../schemas/stockInBundlePiece.schema.js";

class StockInBundlePieceRepository {
    async createMany(tx, rows) {
        return tx.insert(stockInBundlePiece).values(rows);
    }
}

export default new StockInBundlePieceRepository();

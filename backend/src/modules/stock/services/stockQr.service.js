import stockItemQrRepository from "../repositories/stockItemQr.repository.js";
import ApiError from "../../../core/apiError.js";

const QR_ELIGIBLE_TYPES = new Set(["SET", "BUNDLE"]);

class StockQrService {
    _stockItemQrRepository = stockItemQrRepository;

    buildPayload({ designCode, designName, colorName, stockItemId }) {
        if (!designCode) {
            throw new ApiError(
                `Design code is required to generate a QR payload for stock item ${stockItemId}.`,
                400,
                "DESIGN_CODE_REQUIRED_FOR_QR"
            );
        }

        return { designCode, designName, colorName, setId: stockItemId };
    }

    async generateForStockItems(tx, stockItems, { designCode, designName, colorName }) {
        const eligibleItems = stockItems.filter((item) => QR_ELIGIBLE_TYPES.has(item.type));
        if (eligibleItems.length === 0) return [];

        const rows = eligibleItems.map((item) => ({
            stockItemId: item.id,
            payload: this.buildPayload({ designCode, designName, colorName, stockItemId: item.id }),
        }));

        return this._stockItemQrRepository.createMany(tx, rows);
    }
}

export default new StockQrService();

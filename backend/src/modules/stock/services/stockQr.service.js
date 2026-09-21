import stockItemQrRepository from "../repositories/stockItemQr.repository.js";
import ApiError from "../../../core/apiError.js";
import { generateUniqueShortCode } from "../utils/qrShortCode.util.js";

// PIECE is included here for stock items tagged directly by this file's caller (Stock-In's
// Parent+Child / tag-loose-pieces strategies) — every PIECE passed in has already been
// individually created for exactly this purpose, so no extra filtering condition is needed
// beyond "is this type ever meant to carry its own QR".
const QR_ELIGIBLE_TYPES = new Set(["SET", "BUNDLE", "PIECE"]);

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

        // Every ACTIVE row needs its own collision-checked shortCode (see qrShortCode.util.js) —
        // generated sequentially so `existsActiveShortCode` sees each prior pick in this same
        // batch, same pattern as qrCenter.service.js's single-item generation path.
        const rows = [];
        for (const item of eligibleItems) {
            const shortCode = await generateUniqueShortCode((candidate) =>
                this._stockItemQrRepository.existsActiveShortCode(tx, candidate)
            );
            rows.push({
                stockItemId: item.id,
                payload: this.buildPayload({ designCode, designName, colorName, stockItemId: item.id }),
                shortCode,
            });
        }

        return this._stockItemQrRepository.createMany(tx, rows);
    }
}

export default new StockQrService();

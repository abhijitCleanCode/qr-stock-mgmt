import stockGroupRepository from "../repositories/stockGroup.repository.js";
import stockItemRepository from "../repositories/stockItem.repository.js";
import stockItemQrRepository from "../repositories/stockItemQr.repository.js";
import stockQrService from "./stockQr.service.js";
import { generateUniqueShortCode } from "../utils/qrShortCode.util.js";

// Expands a composition (one entry per physical piece a SET/BUNDLE contains — for a SET,
// every full-set size once; for a BUNDLE, that bundle's own sizes, each repeated by its own
// quantity) into individually-tagged PIECE stock items + ACTIVE QR rows, all sharing the
// variant's single PIECE stock_group (see stock_groups_piece_unique_idx).
//
// `sizeEntries`: [{ designSizeId, sizeLabel, unsetPricePerSize }, ...] — one entry PER
// PHYSICAL PIECE, already expanded by quantity (a 2-of-this-size bundle passes that size
// twice). `originSetStockItemId`: the SET/BUNDLE stock item this piece came from, or `null`
// for a piece tagged directly from loose stock (no parent to point back to). `insideParent`:
// true when the piece is a child tag that stays INSIDE that set (Stock In Parent+Child tagging),
// false when the set is being broken and the piece becomes loose.
class StockPieceExpansionService {
    _stockGroupRepository = stockGroupRepository;
    _stockItemRepository = stockItemRepository;
    _stockItemQrRepository = stockItemQrRepository;
    _stockQrService = stockQrService;

    async createPiecesForComposition(tx, {
        colorVariantId,
        sizeEntries,
        originSetStockItemId,
        insideParent = false,
        stockInTransactionId = null,
        designCode,
        designName,
        colorName,
    }) {
        if (sizeEntries.length === 0) return [];

        const pieceGroup = await this._stockGroupRepository.findOrCreate(tx, { colorVariantId, type: "PIECE" });

        const createdItems = await this._stockItemRepository.createMany(tx, sizeEntries.map((size) => ({
            stockGroupId: pieceGroup.id,
            colorVariantId,
            designSizeId: size.designSizeId,
            stockInTransactionId,
            bundleId: null,
            type: "PIECE",
            status: "AVAILABLE",
            originSetStockItemId,
            parentStockItemId: insideParent ? originSetStockItemId : null,
        })));

        const results = [];
        for (let i = 0; i < createdItems.length; i++) {
            const item = createdItems[i];
            const size = sizeEntries[i];
            const shortCode = await generateUniqueShortCode((candidate) =>
                this._stockItemQrRepository.existsActiveShortCode(tx, candidate)
            );

            const qrRow = await this._stockItemQrRepository.create(tx, {
                stockItemId: item.id,
                payload: this._stockQrService.buildPayload({ designCode, designName, colorName, stockItemId: item.id }),
                shortCode,
                status: "ACTIVE",
                priceSnapshot: size.unsetPricePerSize,
            });

            results.push({ stockItem: item, qr: qrRow, sizeLabel: size.sizeLabel });
        }

        return results;
    }
}

export default new StockPieceExpansionService();

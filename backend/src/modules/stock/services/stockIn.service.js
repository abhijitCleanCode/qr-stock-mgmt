import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";

import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockInBundleRepository from "../repositories/stockInBundle.repository.js";
import stockInBundlePieceRepository from "../repositories/stockInBundlePiece.repository.js";
import stockInLoosePieceRepository from "../repositories/stockInLoosePiece.repository.js";
import stockInEntryRepository from "../repositories/stockInEntry.repository.js";

import variantInventoryRepository from "../../inventory/repositories/variantInventory.repository.js";
import variantStatusTransactionRepository from "../../inventory/repositories/variantStatusTransaction.repository.js";

import stockInValidator from "./stockInValidator.service.js";
import stockInCalculatorService from "./stockInCalculator.service.js";
import stockInPersistence from "./stockInPersistence.service.js";
import stockInResultMapper from "../mapper/stockInResultMapper.js";

function todayAsIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

// SET: every active size for the variant currently has inventory > 0 (sellable as a complete matched set).
function computeStatus(activeSizes, qtyMap) {
    return activeSizes.every((size) => (qtyMap.get(size.id) ?? 0) > 0) ? "SET" : "UNSET";
}

class StockInService {
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;

    _stockInTransactionRepository = stockInTransactionRepository;
    _stockInBundleRepository = stockInBundleRepository;
    _stockInBundlePieceRepository = stockInBundlePieceRepository;
    _stockInLoosePieceRepository = stockInLoosePieceRepository;
    _stockInEntryRepository = stockInEntryRepository;

    _variantInventoryRepository = variantInventoryRepository;
    _variantStatusTransactionRepository = variantStatusTransactionRepository;

    _stockInValidator = stockInValidator;
    _stockInCalculator = stockInCalculatorService;
    _stockInPersistence = stockInPersistence;

    _stockInResultMapper = stockInResultMapper;

    // One request can register stock for many Color Variants across many Designs in a single
    // submission. Every variant gets its own StockInTransaction, but the whole request commits
    // or rolls back together as one atomic database transaction.
    async registerStockIn(data) {
        return db.transaction(async (tx) => {
            const variantResults = [];

            for (const design of data.designs) {
                for (const variantInput of design.variants) {
                    const result = await this._registerVariantStockIn(tx, design.designId, variantInput);
                    variantResults.push(result);
                }
            }

            return {
                transactionsCreated: variantResults.length,
                variants: variantResults,
            };
        });
    }

    async _registerVariantStockIn(tx, designId, variantInput) {
        // 1. Validate request and load required variant context
        const validateStockIn = await this._stockInValidator.validate(tx, designId, variantInput);

        // 2. delta: per size quantity to add by sets + bundle + loose piece
        const delta = this._stockInCalculator.calculateStockIn(validateStockIn.activeSizes, variantInput);

        // 3. create stock in transaction record
        const stockInTransaction = await this._stockInPersistence.createStockInTransaction(tx, validateStockIn.variant, variantInput);

        // 4. update current inventory
        const updatedInventory = await this._variantInventoryRepository.upsertIncrement(tx,
            this._variantInventoryRepository.buildIncrementRows(validateStockIn.variant.id, delta)
        );

        // 5. store normalized inventory ledger
        await this._stockInPersistence.createEntries(tx, stockInTransaction.id, validateStockIn.variant.id, delta);

        // 6. build response
        return this._stockInResultMapper.map({
            designId,
            variant: validateStockIn.variant,
            transaction: stockInTransaction,
            activeSizes: validateStockIn.activeSizes,
            delta,
            updatedInventory,
            variantInput,
        })
    }
}

export default new StockInService();

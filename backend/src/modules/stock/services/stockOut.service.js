import { db } from "../../../database/index.js";

import variantInventoryRepository from "../../inventory/repositories/variantInventory.repository.js";

import stockOutValidator from "./stockOutValidator.service.js";
import stockOutCalculatorService from "./stockOutCalculator.service.js";
import stockOutPersistence from "./stockOutPersistence.service.js";
import stockOutResultMapper from "../mapper/stockOutResultMapper.js";
import stockHistoryService from "./stockHistory.service.js";

// Snapshot of what this Stock Out actually removed, for the STOCK_OUT history event's
// metadata — built from the same delta/variantInput/consumed ids already computed for
// persistence, never re-derived from stock_items/variant_inventory afterwards.
function buildStockOutHistoryMetadata({ delta, variantInput, consumedStockItemIds }) {
    const sizeBreakdown = [...delta.entries()]
        .filter(([, quantity]) => quantity > 0)
        .map(([designSizeId, quantitySold]) => ({ designSizeId, quantitySold }));

    return {
        sizeBreakdown,
        totalSetsSold: variantInput.totalSetsSold ?? 0,
        bundles: variantInput.bundles ?? [],
        loosePieces: variantInput.loosePieces ?? [],
        retailerName: variantInput.retailerName,
        unitPrice: variantInput.unitPrice,
        consumedStockItemIds,
    };
}

class StockOutService {

    _variantInventoryRepository = variantInventoryRepository;
    _stockOutValidator = stockOutValidator;
    _stockOutCalculator = stockOutCalculatorService;
    _stockOutPersistence = stockOutPersistence;
    _stockHistoryService = stockHistoryService;

    _stockOutResultMapper = stockOutResultMapper;

    // One request can register stock-out for many Color Variants across many Designs in a
    // single submission (one sale to one retailer covering multiple designs). Every variant
    // gets its own StockOutTransaction, but the whole request commits or rolls back together.
    async registerStockOut(data) {
        return db.transaction(async (tx) => {
            const variantResults = [];

            for (const design of data.designs) {
                for (const variantInput of design.variants) {
                    const result = await this._registerVariantStockOut(tx, design.designId, {
                        ...variantInput,
                        retailerName: data.retailerName,
                    });
                    variantResults.push(result);
                }
            }

            return {
                transactionsCreated: variantResults.length,
                variants: variantResults,
            };
        });
    }

    async _registerVariantStockOut(tx, designId, variantInput) {
        // 1. Validate request and load required variant context
        const { variant, activeSizes, bundleGroups } = await this._stockOutValidator.validate(tx, designId, variantInput);

        // 2. delta: per size quantity sold, from sets + bundles + loose pieces
        const delta = this._stockOutCalculator.calculateStockOut(activeSizes, variantInput, bundleGroups);

        // 3. create stock out transaction record
        const transaction = await this._stockOutPersistence.createStockOutTransaction(tx, variantInput);

        // 4. consume the actual physical stock items being sold — throws if any part is short
        const consumedSetIds = await this._stockOutPersistence.consumeSets(tx, variant.id, variantInput.totalSetsSold ?? 0);
        const consumedBundleIds = await this._stockOutPersistence.consumeBundles(tx, variantInput.bundles ?? []);
        const consumedLoosePieceIds = await this._stockOutPersistence.consumeLoosePieces(tx, variant.id, variantInput.loosePieces ?? []);
        const consumedStockItemIds = [...consumedSetIds, ...consumedBundleIds, ...consumedLoosePieceIds];

        // 5. update current inventory (decrement)
        const updatedInventory = await this._variantInventoryRepository.upsertIncrement(tx,
            this._variantInventoryRepository.buildDecrementRows(variant.id, delta)
        );

        // 6. store normalized inventory ledger
        await this._stockOutPersistence.createEntries(tx, transaction.id, variant.id, delta, variantInput.unitPrice);

        // 7. record the STOCK_OUT history event — same tx, so it commits/rolls back with
        // everything above.
        const totalQuantitySold = [...delta.values()].reduce((sum, quantity) => sum + quantity, 0);
        await this._stockHistoryService.record(tx, "STOCK_OUT", {
            colorVariantId: variant.id,
            stockOutTransactionId: transaction.id,
            quantity: totalQuantitySold,
            metadata: buildStockOutHistoryMetadata({ delta, variantInput, consumedStockItemIds }),
        });

        // 8. build response
        return this._stockOutResultMapper.map({
            designId,
            variant,
            transaction,
            activeSizes,
            delta,
            updatedInventory,
            variantInput,
        });
    }
}

export default new StockOutService();

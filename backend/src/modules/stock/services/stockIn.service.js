import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import variantInventoryRepository from "../../inventory/repositories/variantInventory.repository.js";

import stockInValidator from "./stockInValidator.service.js";
import stockInCalculatorService from "./stockInCalculator.service.js";
import stockInPersistence from "./stockInPersistence.service.js";
import stockInResultMapper from "../mapper/stockInResultMapper.js";
import stockQrService from "./stockQr.service.js";
import stockHistoryService from "./stockHistory.service.js";

function todayAsIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

// Snapshot of what this Stock In actually added, for the STOCK_IN history event's metadata —
// built from the same `delta`/`createdBundles`/`variantInput` already computed for persistence,
// never re-derived from stock_items/variant_inventory afterwards.
function buildStockInHistoryMetadata({ delta, variantInput, createdBundles }) {
    const sizeBreakdown = [...delta.entries()]
        .filter(([, quantity]) => quantity > 0)
        .map(([designSizeId, quantityAdded]) => ({ designSizeId, quantityAdded }));

    // createdBundles preserves the same order as variantInput.bundles (see
    // stockInPersistence.service.js's _saveBundles), so composition can be zipped back in by
    // index — createdBundles itself only carries the persisted bundleNumber/quantity columns.
    const bundles = (variantInput.bundles ?? []).map((bundle, index) => ({
        bundleNumber: createdBundles[index].bundleNumber,
        quantity: createdBundles[index].quantity,
        composition: bundle.composition.map((piece) => ({ designSizeId: piece.designSizeId, quantity: piece.quantity })),
    }));

    const loosePieces = (variantInput.loosePieces ?? []).map((piece) => ({
        designSizeId: piece.designSizeId,
        quantity: piece.quantity,
    }));

    return {
        sizeBreakdown,
        totalSetsReceived: variantInput.totalSetsReceived ?? 0,
        bundles,
        loosePieces,
    };
}

// SET: every active size for the variant currently has inventory > 0 (sellable as a complete matched set).
function computeStatus(activeSizes, qtyMap) {
    return activeSizes.every((size) => (qtyMap.get(size.id) ?? 0) > 0) ? "SET" : "UNSET";
}

class StockInService {

    _variantInventoryRepository = variantInventoryRepository;
    _stockInValidator = stockInValidator;
    _stockInCalculator = stockInCalculatorService;
    _stockInPersistence = stockInPersistence;
    _stockQrService = stockQrService;
    _stockHistoryService = stockHistoryService;

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
        const { transaction: stockInTransaction, createdBundles } = await this._stockInPersistence.createStockInTransaction(tx, validateStockIn.variant, variantInput);

        // 3.5 NEW: resolve (find-or-create) the stock groups this registration belongs to
        const setGroup = variantInput.totalSetsReceived > 0 ? await this._stockInPersistence.resolveSetGroup(tx, validateStockIn.variant.id) : null;
        // skip creating stock groups if there are no sets

        const bundleGroups = await this._stockInPersistence.resolveBundleGroups(tx, validateStockIn.variant.id, variantInput.bundles ?? []);
        const loosePieceGroups = await this._stockInPersistence.resolveLoosePieceGroups(tx, validateStockIn.variant.id, variantInput.loosePieces ?? []);

        // 3.6 NEW: create individual stock_items rows — unique IDs come from this insert
        const stockItems = await this._stockInPersistence.createStockItems(tx, {
            stockInTransactionId: stockInTransaction.id,
            colorVariantId: validateStockIn.variant.id,
            variantInput,
            setGroup,
            createdBundles,
            bundleGroups,
            loosePieceGroups,
        });

        // 3.7 NEW: generate + persist QR history for every SET/BUNDLE stock item just created
        await this._stockQrService.generateForStockItems(tx, stockItems, {
            designCode: validateStockIn.variant.designCode,
            designName: validateStockIn.variant.designName,
            colorName: validateStockIn.variant.colorName,
        });

        // 4. update current inventory
        const updatedInventory = await this._variantInventoryRepository.upsertIncrement(tx,
            this._variantInventoryRepository.buildIncrementRows(validateStockIn.variant.id, delta)
        );

        // 5. store normalized inventory ledger
        await this._stockInPersistence.createEntries(tx, stockInTransaction.id, validateStockIn.variant.id, delta);

        // 5.5 NEW: record the STOCK_IN history event — same tx, so it commits/rolls back with
        // everything above. No resultStockItemId/stockGroupId: a single Stock In can create many
        // stock items across multiple groups (sets + several bundle groups + loose groups), so
        // there is no single one that would be a non-arbitrary choice here.
        const totalQuantityAdded = [...delta.values()].reduce((sum, quantity) => sum + quantity, 0);
        await this._stockHistoryService.record(tx, "STOCK_IN", {
            colorVariantId: validateStockIn.variant.id,
            stockInTransactionId: stockInTransaction.id,
            quantity: totalQuantityAdded,
            metadata: buildStockInHistoryMetadata({ delta, variantInput, createdBundles }),
        });

        // 6. build response
        return this._stockInResultMapper.map({
            designId,
            variant: validateStockIn.variant,
            transaction: stockInTransaction,
            activeSizes: validateStockIn.activeSizes,
            delta,
            updatedInventory,
            variantInput,
            stockGroupId: setGroup?.id ?? null,
            stockItems
        });
    }
}

export default new StockInService();

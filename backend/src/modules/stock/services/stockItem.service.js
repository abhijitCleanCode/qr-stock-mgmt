import ApiError from "../../../core/apiError.js";
import { db } from "../../../database/index.js";

import { buildBundleCompositionSignature } from "./stockInPersistence.service.js";

import stockItemRepository from "../repositories/stockItem.repository.js";
import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";
import stockGroupRepository from "../repositories/stockGroup.repository.js";
import stockItemLineageRepository from "../repositories/stockItemLineage.repository.js";

// Business vocabulary at the API boundary (SET/UNSET), mapped to the DB's AVAILABLE/UNSET inside the service
const API_TO_DB_STATUS = { SET: "AVAILABLE", UNSET: "UNSET" };

class StockItemService {
    _stockItemRepository = stockItemRepository;
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;
    _stockGroupRepository = stockGroupRepository;
    _stockItemLineageRepository = stockItemLineageRepository;

    async transitionStatus(id, targetStatus) {
        return db.transaction(async (tx) => {
            const to = API_TO_DB_STATUS[targetStatus];
            const form = to === "AVAILABLE" ? "UNSET" : "AVAILABLE";
            const unsetAt = to === "UNSET" ? new Date() : null;

            const updated = await this._stockItemRepository.updateStatusIfCurrentAndFlippable(tx, id, { form, to, unsetAt });
            if (updated) return updated;

            // CAS missed — read to find out exactly why, and report the right error
            const current = await this._stockItemRepository.findById(tx, id);
            if (!current) {
                throw new ApiError(`Stock item ${id} not found.`, 404, "STOCK_ITEM_NOT_FOUND");
            }
            if (current.type === "LOOSE_PIECE") {
                throw new ApiError(`Loose piece stock items cannot change status directly.`, 400, "LOOSE_PIECE_STATUS_IMMUTABLE");
            }
            if (current.status === "CONSUMED") {
                throw new ApiError(`Stock item ${id} has been consumed and cannot change status.`, 400, "STOCK_ITEM_CONSUMED");
            }
            if (current.status === to) {
                return current; // idempotent: already at the requested status
            }

            throw new ApiError(`Stock item ${id} status changed concurrently; retry.`, 409, "STOCK_ITEM_STATUS_CONFLICT");
        })
    }

    async assembleSet(colorVariantId) {
        return db.transaction(async (tx) => {
            const variant = await this._colorVariantRepository.findActiveById(tx, colorVariantId);
            if (!variant) {
                throw new ApiError(`Color variant ${colorVariantId} not found or inactive.`, 404, "VARIANT_NOT_FOUND");
            }

            const activeSizes = await this._designSizeRepository.findActiveByVariantId(tx, colorVariantId);
            // same business rule used by _addCompleteSets() during registration need to ensure assembly also follow the same business principle 
            const setSizes = activeSizes.filter((size) => size.includedInSet);
            if (setSizes.length === 0) {
                throw new ApiError(`Color variant ${colorVariantId} has no sizes configured as part of a set.`, 400, "NO_SET_SIZES");
            }

            const sourceItems = [];
            const shortSizes = [];
            for (const size of setSizes) {
                // limit = 1 as size needs exactly one physical loose piece and repository method remains reusable for bundle
                const [locked] = await this._stockItemRepository.findAndLockAvailableBySize(tx, colorVariantId, size.id, 1);
                if (locked) sourceItems.push(locked);
                else shortSizes.push(size.id);
            }
            if (shortSizes.length > 0) {
                throw new ApiError(`Not enough loose pieces to assemble a SET; missing sizes: ${shortSizes.join(", ")}.`, 409, "INSUFFICIENT_LOOSE_PIECES");
            }

            // all required pieces are found
            const setGroup = await this._stockGroupRepository.findOrCreate(tx, { colorVariantId, type: "SET" });

            // create new stock item
            const [created] = await this._stockItemRepository.createMany(tx, [{
                stockGroupId: setGroup.id,
                colorVariantId,
                // because this set wasn't directlt received from one stock-in transaction.
                stockInTransactionId: null,
                bundleId: null,
                type: "SET",
                status: "AVAILABLE",
            }]);

            // consume the source pieces
            // 1. get their ids
            const sourceIds = sourceItems.map((item) => item.id);
            // 2. mark consumed
            await this._stockItemRepository.markConsumed(tx, sourceIds);

            // create lineage
            const rows = sourceIds.map((sourceStockItemId) => ({
                resultStockItemId: created.id,
                sourceStockItemId,
            }));
            await this._stockItemLineageRepository.createMany(tx, rows);

            return { created, consumed: sourceIds };
        })
    }

    async assembleBundle(colorVariantId, composition) {
        return db.transaction(async (tx) => {
            const variant = await this._colorVariantRepository.findActiveById(tx, colorVariantId);
            if (!variant) {
                throw new ApiError(`Color variant ${colorVariantId} not found or inactive.`, 404, "VARIANT_NOT_FOUND");
            }

            const activeSizes = await this._designSizeRepository.findActiveByVariantId(tx, colorVariantId);
            const activeSizeIds = new Set(activeSizes.map((size) => size.id));
            const invalidSizeIds = composition.map((piece) => piece.designSizeId).filter((id) => !activeSizeIds.has(id));
            if (invalidSizeIds.length > 0) {
                throw new ApiError(`Invalid or inactive designSizeId(s): ${invalidSizeIds.join(", ")}.`, 400, "INVALID_DESIGN_SIZE");
            }

            const sourceItems = [];
            const shortEntries = [];
            for (const piece of composition) {
                const locked = await this._stockItemRepository.findAndLockAvailableBySize(tx, colorVariantId, piece.designSizeId, piece.quantity);
                if (locked.length < piece.quantity) {
                    shortEntries.push({ designSizeId: piece.designSizeId, needed: piece.quantity, available: locked.length });
                }
                sourceItems.push(...locked);
            }

            if (shortEntries.length > 0) {
                throw new ApiError(`Not enough loose pieces to assemble this bundle: ${JSON.stringify(shortEntries)}.`, 409, "INSUFFICIENT_LOOSE_PIECES");
            }

            const compositionSignature = buildBundleCompositionSignature(composition);
            const bundleGroup = await this._stockGroupRepository.findOrCreate(tx, { colorVariantId, type: "BUNDLE", compositionSignature });

            const [created] = await this._stockItemRepository.createMany(tx, [{
                stockGroupId: bundleGroup.id,
                colorVariantId,
                stockInTransactionId: null,
                bundleId: null, // not tied to any received stock_in_bundle instance — this bundle was assembled, not received
                type: "BUNDLE",
                status: "AVAILABLE",
            }]);

            const sourceIds = sourceItems.map((item) => item.id);
            await this._stockItemRepository.markConsumed(tx, sourceIds);
            await this._stockItemLineageRepository.createMany(tx, sourceIds.map((sourceStockItemId) => ({
                resultStockItemId: created.id,
                sourceStockItemId,
            })));

            return { created, consumed: sourceIds };
        })
    }
}

export default new StockItemService();

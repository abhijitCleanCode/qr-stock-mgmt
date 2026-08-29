import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";
import stockItemRepository from "../../stock/repositories/stockItem.repository.js";
import stockGroupRepository from "../../stock/repositories/stockGroup.repository.js";
import { parseBundleCompositionSignature } from "../../stock/services/stockInPersistence.service.js";
import variantInventoryRepository from "../repositories/variantInventory.repository.js";

const EMPTY_TOTALS = { setPieces: 0, bundlePieces: 0, loosePieces: 0, totalPieces: 0 };

class CurrentStockService {
    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;
    _stockItemRepository = stockItemRepository;
    _stockGroupRepository = stockGroupRepository;
    _variantInventoryRepository = variantInventoryRepository;

    // Summary-only: totalPieces per Design + Color Variant, straight from variant_inventory
    // (already the current-total-physical-pieces projection — see variantInventory.schema.js).
    // Deliberately does NOT touch stock_items/stock_groups or explode set/bundle composition;
    // that breakdown belongs to the separate Current Stock Detail API.
    async getCurrentStockSummary({ page, limit, keyword }) {
        const offset = (page - 1) * limit;

        const [variants, total] = await Promise.all([
            this._colorVariantRepository.findAll({ limit, offset, keyword }),
            this._colorVariantRepository.count({ keyword }),
        ]);

        const colorVariantIds = variants.map((variant) => variant.colorVariantId);
        const totals = await this._variantInventoryRepository.sumQuantityByColorVariantIds(colorVariantIds);
        const totalPiecesByVariantId = new Map(totals.map((row) => [row.colorVariantId, row.totalPieces]));

        return {
            data: variants.map((variant) => {
                // No variant_inventory rows yet (never received) → 0, not excluded — the Current
                // Stock table is expected to surface out-of-stock variants, not hide them.
                const totalPieces = totalPiecesByVariantId.get(variant.colorVariantId) ?? 0;

                return {
                    designId: variant.designId,
                    designCode: variant.designCode,
                    designName: variant.designName,
                    colorVariantId: variant.colorVariantId,
                    colorName: variant.colorName,
                    colorHex: variant.colorHex,
                    imageUrl: variant.imageUrl,
                    totalPieces,
                    status: totalPieces > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
                };
            }),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Detail breakdown for one Design + Color Variant: physical pieces per size, split by
    // set/bundle/loose. Deliberately derived from stock_items + stock_groups — NOT from
    // variant_inventory, which only holds the blended total (see currentStockSummary above).
    async getCurrentStockDetail(colorVariantId) {
        const variant = await this._colorVariantRepository.findActiveById(db, colorVariantId);
        if (!variant) {
            throw new ApiError(`Color variant ${colorVariantId} not found or inactive.`, 404, "VARIANT_NOT_FOUND");
        }

        const sizes = await this._designSizeRepository.findActiveByVariantId(db, colorVariantId);

        const [loosePiecesBySize, setCount, bundleCountsByGroup] = await Promise.all([
            this._stockItemRepository.countLoosePiecesBySize(db, colorVariantId),
            this._stockItemRepository.countAvailableSets(db, colorVariantId),
            this._stockItemRepository.countBundlesByStockGroup(db, colorVariantId),
        ]);

        const loosePiecesByDesignSizeId = new Map(
            loosePiecesBySize.map((row) => [row.designSizeId, row.pieceCount])
        );

        // Resolve each bundle stock group's composition once, then explode bundleCount × pieceCount
        // per size — this is what avoids treating a "1 bundle" row as "1 piece per size" (§7).
        const bundleGroupIds = bundleCountsByGroup.map((row) => row.stockGroupId);
        const bundleGroups = await this._stockGroupRepository.findByIds(db, bundleGroupIds);
        const compositionByGroupId = new Map(
            bundleGroups.map((group) => [group.id, parseBundleCompositionSignature(group.compositionSignature)])
        );

        const bundlePiecesByDesignSizeId = new Map();
        for (const { stockGroupId, bundleCount } of bundleCountsByGroup) {
            const composition = compositionByGroupId.get(stockGroupId) ?? [];

            for (const piece of composition) {
                const existing = bundlePiecesByDesignSizeId.get(piece.designSizeId) ?? 0;
                bundlePiecesByDesignSizeId.set(piece.designSizeId, existing + piece.quantity * bundleCount);
            }
        }

        // Per-composition breakdown for the "Bundle Compositions" view — same bundleCount/
        // composition data already resolved above for the per-size explosion, just kept intact
        // here instead of only being folded into bundlePiecesByDesignSizeId.
        const sizeLabelById = new Map(sizes.map((size) => [size.id, size.sizeLabel]));
        const compositions = bundleCountsByGroup.map(({ stockGroupId, bundleCount }) => {
            const composition = compositionByGroupId.get(stockGroupId) ?? [];
            const piecesPerBundle = composition.reduce((sum, piece) => sum + piece.quantity, 0);

            return {
                stockGroupId,
                bundleCount,
                composition: composition.map((piece) => ({
                    designSizeId: piece.designSizeId,
                    // Falls back to the raw id if this composition references a size that's since
                    // been deactivated — sizes[] only lists currently active sizes (see §14 of the
                    // detail API design), so it can't always resolve a label.
                    size: sizeLabelById.get(piece.designSizeId) ?? String(piece.designSizeId),
                    quantity: piece.quantity,
                })),
                piecesPerBundle,
                totalPieces: piecesPerBundle * bundleCount,
            };
        }).sort((a, b) => a.stockGroupId - b.stockGroupId);

        const sizeRows = sizes.map((size) => {
            // A SET has no designSizeId of its own — it contributes 1 piece to every size that's
            // currently part of "a complete set" for this variant (same rule as
            // stockInCalculator._addCompleteSets / stockItem.service.assembleSet's setSizes).
            const setPieces = size.includedInSet ? setCount : 0;
            const bundlePieces = bundlePiecesByDesignSizeId.get(size.id) ?? 0;
            const loosePieces = loosePiecesByDesignSizeId.get(size.id) ?? 0;

            return {
                designSizeId: size.id,
                size: size.sizeLabel,
                setPieces,
                bundlePieces,
                loosePieces,
                totalPieces: setPieces + bundlePieces + loosePieces,
            };
        });

        const totals = sizeRows.reduce((acc, row) => ({
            setPieces: acc.setPieces + row.setPieces,
            bundlePieces: acc.bundlePieces + row.bundlePieces,
            loosePieces: acc.loosePieces + row.loosePieces,
            totalPieces: acc.totalPieces + row.totalPieces,
        }), { ...EMPTY_TOTALS });

        return {
            design: {
                id: variant.designId,
                code: variant.designCode,
                name: variant.designName,
            },
            variant: {
                id: variant.id,
                colorName: variant.colorName,
                colorHex: variant.colorHex,
                imageUrl: variant.imageUrl,
            },
            sizes: sizeRows,
            compositions,
            totals,
        };
    }
}

export default new CurrentStockService();

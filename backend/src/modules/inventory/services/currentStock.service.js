import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";
import variantInventoryRepository from "../repositories/variantInventory.repository.js";

class CurrentStockService {
    _colorVariantRepository = colorVariantRepository;
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
}

export default new CurrentStockService();

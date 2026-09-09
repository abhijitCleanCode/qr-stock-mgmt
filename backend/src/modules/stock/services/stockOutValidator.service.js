import colorVariantRepository from "../../design/repositories/colorVariant.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";
import stockGroupRepository from "../repositories/stockGroup.repository.js";

import ApiError from "../../../core/apiError.js";

class StockOutValidator {

    _colorVariantRepository = colorVariantRepository;
    _designSizeRepository = designSizeRepository;
    _stockGroupRepository = stockGroupRepository;

    // Structural validation only — variant/design/size references are real and belong to each
    // other, and bundle stock groups being sold actually exist for this variant. Whether enough
    // physical stock exists to fulfil the requested quantities is checked at lock time in
    // stockOutPersistence.service.js (same convention as stockItem.service.js's
    // assembleSet/assembleBundle), never re-derived here from variant_inventory.
    async validate(tx, designId, input) {
        const variant = await this._colorVariantRepository.findActiveById(tx, input.colorVariantId);

        if (!variant) {
            throw new ApiError(`Color variant ${input.colorVariantId} not found or inactive.`, 404, "VARIANT_NOT_FOUND");
        }

        if (variant.designId !== designId) {
            throw new ApiError(`Color variant ${input.colorVariantId} does not belong to design ${designId}.`, 400, "VARIANT_DESIGN_MISMATCH");
        }

        const activeSizes = await this._designSizeRepository.findActiveByVariantId(tx, variant.id);
        if (activeSizes.length === 0) {
            throw new ApiError(`Design ${designId} has no active sizes.`, 400, "NO_ACTIVE_SIZES");
        }

        this._validateLoosePieceSizes(input, activeSizes, variant.id);

        const bundleGroups = await this._validateBundleGroups(tx, input, variant.id);

        return { variant, activeSizes, bundleGroups };
    }

    _validateLoosePieceSizes(input, activeSizes, variantId) {
        const validSizeIds = new Set(activeSizes.map((size) => size.id));

        const invalidSizeIds = (input.loosePieces ?? [])
            .map((piece) => piece.designSizeId)
            .filter((id) => !validSizeIds.has(id));

        if (invalidSizeIds.length > 0) {
            throw new ApiError(`Invalid or inactive designSizeId(s) for color variant ${variantId}: ${invalidSizeIds.join(", ")}`, 400, "INVALID_DESIGN_SIZE");
        }
    }

    // Every referenced bundle must be an existing BUNDLE stock group owned by this exact
    // variant — you can only sell a bundle composition that was actually assembled/received.
    async _validateBundleGroups(tx, input, variantId) {
        const bundles = input.bundles ?? [];
        if (bundles.length === 0) return [];

        const groupIds = bundles.map((bundle) => bundle.stockGroupId);
        const groups = await this._stockGroupRepository.findByIds(tx, groupIds);
        const groupById = new Map(groups.map((group) => [group.id, group]));

        const invalid = groupIds.filter((id) => {
            const group = groupById.get(id);
            return !group || group.type !== "BUNDLE" || group.colorVariantId !== variantId;
        });

        if (invalid.length > 0) {
            throw new ApiError(`Invalid bundle stockGroupId(s) for color variant ${variantId}: ${invalid.join(", ")}`, 400, "INVALID_STOCK_GROUP");
        }

        return groupIds.map((id) => groupById.get(id));
    }
}

export default new StockOutValidator();

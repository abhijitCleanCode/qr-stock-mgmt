import { db } from "../../../database/index.js";
import ApiError from "../../../core/apiError.js";

import stockItemQrRepository from "../../stock/repositories/stockItemQr.repository.js";
import stockItemRepository from "../../stock/repositories/stockItem.repository.js";
import stockGroupRepository from "../../stock/repositories/stockGroup.repository.js";
import designSizeRepository from "../../design/repositories/designSize.repository.js";
import { parseBundleCompositionSignature } from "../../stock/services/stockInPersistence.service.js";

// Turns a scanned or typed short code into the stock it represents.
//
// Deliberately leaner than QR Center's resolver, which answers "what is the operational state of
// this label?" with rack, duplicate and retired states for a diagnostic screen. Stock Out asks a
// narrower question — "what am I about to bill, and is it available?" — so this returns the
// pieces and their sizes, and refuses anything ambiguous rather than describing it.
class ScanResolverService {
    _stockItemQrRepository = stockItemQrRepository;
    _stockItemRepository = stockItemRepository;
    _stockGroupRepository = stockGroupRepository;
    _designSizeRepository = designSizeRepository;

    // A SET tag represents every size marked includedInSet for that variant; a BUNDLE tag
    // represents its group's own recorded composition; a single piece represents itself. The
    // breakdown is what the invoice prints, so it is resolved here once and snapshotted.
    async _sizeBreakdown(runner, context) {
        if (context.type === "SET") {
            const sizes = await this._designSizeRepository.findActiveByVariantId(runner, context.colorVariantId);
            const included = sizes.filter((size) => size.includedInSet);

            if (included.length === 0) {
                throw new ApiError(
                    `${context.designCode ?? "This design"} has no sizes marked as part of a set, so a set tag cannot be billed.`,
                    409,
                    "SET_COMPOSITION_EMPTY",
                );
            }

            return included.map((size) => ({ designSizeId: size.id, sizeLabel: size.sizeLabel, quantity: 1 }));
        }

        if (context.type === "BUNDLE") {
            const group = await this._stockGroupRepository.findById(runner, context.stockGroupId);
            const pieces = parseBundleCompositionSignature(group?.compositionSignature);

            if (pieces.length === 0) {
                throw new ApiError("This bundle has no recorded composition, so it cannot be billed.", 409, "BUNDLE_COMPOSITION_EMPTY");
            }

            const sizes = await this._designSizeRepository.findActiveByVariantId(runner, context.colorVariantId);
            const labelById = new Map(sizes.map((size) => [size.id, size.sizeLabel]));

            return pieces.map((piece) => ({
                designSizeId: piece.designSizeId,
                sizeLabel: labelById.get(piece.designSizeId) ?? "",
                quantity: piece.quantity,
            }));
        }

        // PIECE and LOOSE_PIECE are one physical garment of one size.
        return [{ designSizeId: context.designSizeId, sizeLabel: context.sizeLabel ?? "", quantity: 1 }];
    }

    // Returns null for an unknown code rather than throwing: "not a tag we know" is an ordinary
    // answer at a scanning station, not an exceptional one, and the caller words it for the user.
    async resolve(code, { runner = db } = {}) {
        const shortCode = String(code ?? "").trim().toUpperCase();
        if (!shortCode) return null;

        const qrRows = await this._stockItemQrRepository.findByShortCode(runner, shortCode);
        if (qrRows.length === 0) return null;

        const activeRows = qrRows.filter((row) => row.status === "ACTIVE");

        if (activeRows.length === 0) {
            return { state: "RETIRED", shortCode };
        }

        const stockItemIds = [...new Set(activeRows.map((row) => row.stockItemId))];
        if (stockItemIds.length > 1) {
            // Two physical objects share this label. Billing either one would be a guess, and a
            // guess here removes the wrong garment from stock.
            return { state: "DUPLICATE", shortCode, stockItemIds };
        }

        const context = await this._stockItemRepository.findWithContextById(runner, stockItemIds[0]);
        if (!context) return null;

        const sizeBreakdown = await this._sizeBreakdown(runner, context);
        const pieces = sizeBreakdown.reduce((total, size) => total + size.quantity, 0);

        return {
            state: "OK",
            shortCode,
            stockItemId: context.stockItemId,
            kind: context.type,
            status: context.status,
            colorVariantId: context.colorVariantId,
            designId: context.designId,
            designCode: context.designCode,
            designName: context.designName,
            colorName: context.colorName,
            colorHex: context.colorHex,
            unitPrice: Number(context.defaultSellingPricePerPiece ?? 0),
            rackCode: context.rackCode ?? null,
            binCode: context.binCode ?? null,
            sizeBreakdown,
            pieces,
        };
    }
}

export default new ScanResolverService();

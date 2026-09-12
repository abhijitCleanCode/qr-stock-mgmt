import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockInBundleRepository from "../repositories/stockInBundle.repository.js";
import stockInBundlePieceRepository from "../repositories/stockInBundlePiece.repository.js";
import stockInLoosePieceRepository from "../repositories/stockInLoosePiece.repository.js";
import stockInEntryRepository from "../repositories/stockInEntry.repository.js";
import stockItemRepository from "../repositories/stockItem.repository.js";
import stockGroupRepository from "../repositories/stockGroup.repository.js";

function todayAsIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

export function buildBundleCompositionSignature(composition) {
    return [...composition]
        .sort((a, b) => a.designSizeId - b.designSizeId)
        .map((piece) => `${piece.designSizeId}:${piece.quantity}`)
        .join(",");
}

// Inverse of buildBundleCompositionSignature — "12:1,13:2" -> [{designSizeId:12,quantity:1}, ...].
// Only ever produced by buildBundleCompositionSignature above, for BUNDLE-type stock groups
// (never SET, which has no composition signature, and never LOOSE_PIECE, whose signature is a
// bare designSizeId with no colon).
export function parseBundleCompositionSignature(signature) {
    if (!signature) return [];

    return signature.split(",").reduce((pieces, entry) => {
        const [designSizeId, quantity] = entry.split(":").map(Number);
        if (Number.isInteger(designSizeId) && Number.isInteger(quantity)) {
            pieces.push({ designSizeId, quantity });
        }
        return pieces;
    }, []);
}

class stockInPersistence {

    _stockInTransactionRepository = stockInTransactionRepository;
    _stockInBundleRepository = stockInBundleRepository;
    _stockInBundlePieceRepository = stockInBundlePieceRepository;
    _stockInLoosePieceRepository = stockInLoosePieceRepository;
    _stockInEntryRepository = stockInEntryRepository;
    _stockGroupRepository = stockGroupRepository;
    _stockItemRepository = stockItemRepository;

    async createStockInTransaction(tx, variant, variantInput) {
        const transaction = await this._stockInTransactionRepository.create(tx, {
            variantId: variant.id,
            stockDate: variantInput.stockDate ?? todayAsIsoDate(),
            challanNo: variantInput.challanNo,
            totalSetsReceived: variantInput.totalSetsReceived ?? 0,
            notes: variantInput.notes ?? null,
        });

        // save bundles
        const createdBundles = await this._saveBundles(tx, transaction.id, variantInput.bundles ?? []);

        // save loose pieces
        await this._saveLoosePieces(tx, transaction.id, variantInput.loosePieces ?? []);

        return { transaction, createdBundles };
    }

    async resolveSetGroup(tx, colorVariantId) {
        return this._stockGroupRepository.findOrCreate(tx, { colorVariantId, type: "SET" });
    }

    async _saveBundles(tx, transactionId, bundles) {
        if (bundles.length === 0) return [];

        // building db rows
        const bundleRows = bundles.map((bundle, index) => ({
            stockInTransactionId: transactionId,
            bundleNumber: bundle.bundleNumber ?? index + 1,
            quantity: bundle.quantity,
        }));
        const createdBundles = await this._stockInBundleRepository.createMany(tx, bundleRows);

        // building db rows
        const bundlePieceRows = bundles.flatMap((bundle, index) =>
            bundle.composition.map((piece) => ({
                bundleId: createdBundles[index].id,
                designSizeId: piece.designSizeId,
                quantity: piece.quantity,
            }))
        );
        await this._stockInBundlePieceRepository.createMany(tx, bundlePieceRows);

        return createdBundles;
    }

    async _saveLoosePieces(tx, transactionId, loosePieces) {
        if (loosePieces.length === 0) return;

        // building db rows
        const rows = loosePieces.map((piece) => ({
            stockInTransactionId: transactionId,
            designSizeId: piece.designSizeId,
            quantity: piece.quantity,
        }));
        await this._stockInLoosePieceRepository.createMany(tx, rows);
    }

    async createEntries(tx, transactionId, variantId, delta) {
        const rows = [...delta.entries()].filter(([, quantity]) => quantity > 0).map(([designSizeId, quantity]) => ({
            stockInTransactionId: transactionId,
            colorVariantId: variantId,
            designSizeId,
            quantityAdded: quantity,
        }));

        if (rows.length === 0) return;

        await this._stockInEntryRepository.createMany(tx, rows);
    };

    // returns groups in the same order as `bundles`, one per bundle entry
    async resolveBundleGroups(tx, colorVariantId, bundles) {
        const groups = [];
        for (const bundle of bundles) {
            const compositionSignature = buildBundleCompositionSignature(bundle.composition);
            groups.push(await this._stockGroupRepository.findOrCreate(tx, {
                colorVariantId,
                type: "BUNDLE",
                compositionSignature,
            }));
        }
        return groups;
    }

    async resolveLoosePieceGroups(tx, colorVariantId, loosePieces) {
        const groups = [];
        for (const piece of loosePieces) {
            groups.push(await this._stockGroupRepository.findOrCreate(tx, {
                colorVariantId,
                type: "LOOSE_PIECE",
                compositionSignature: String(piece.designSizeId),
            }));
        }
        return groups;
    }

    async createStockItems(tx, { stockInTransactionId, colorVariantId, variantInput, setGroup, createdBundles, bundleGroups, loosePieceGroups }) {
        const rows = [];

        if (variantInput.totalSetsReceived > 0 && setGroup) {
            for (let i = 0; i < variantInput.totalSetsReceived; i++) {
                rows.push({
                    stockGroupId: setGroup.id,
                    colorVariantId,
                    stockInTransactionId,
                    bundleId: null,
                    type: "SET",
                });
            }
        }

        createdBundles.forEach((bundle, index) => {
            const group = bundleGroups[index];
            for (let i = 0; i < bundle.quantity; i++) {
                rows.push({
                    stockGroupId: group.id,
                    colorVariantId,
                    stockInTransactionId,
                    bundleId: bundle.id,
                    type: "BUNDLE",
                });
            }
        });

        (variantInput.loosePieces ?? []).forEach((piece, index) => {
            const group = loosePieceGroups[index];
            for (let i = 0; i < piece.quantity; i++) {
                rows.push({
                    stockGroupId: group.id,
                    colorVariantId,
                    stockInTransactionId,
                    bundleId: null,
                    designSizeId: piece.designSizeId,
                    type: "LOOSE_PIECE",
                    status: "UNSET", // must set explicitly because default status is "AVAILABLE" and loose piece is UNSET
                });
            }
        });

        return this._stockItemRepository.createMany(tx, rows);
    }
}

export default new stockInPersistence();

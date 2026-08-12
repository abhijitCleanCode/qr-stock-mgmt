import stockInTransactionRepository from "../repositories/stockInTransaction.repository.js";
import stockInBundleRepository from "../repositories/stockInBundle.repository.js";
import stockInBundlePieceRepository from "../repositories/stockInBundlePiece.repository.js";
import stockInLoosePieceRepository from "../repositories/stockInLoosePiece.repository.js";
import stockInEntryRepository from "../repositories/stockInEntry.repository.js";

function todayAsIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
class stockInPersistence {

    _stockInTransactionRepository = stockInTransactionRepository;
    _stockInBundleRepository = stockInBundleRepository;
    _stockInBundlePieceRepository = stockInBundlePieceRepository;
    _stockInLoosePieceRepository = stockInLoosePieceRepository;
    _stockInEntryRepository = stockInEntryRepository;

    async createStockInTransaction(tx, variant, variantInput) {
        const transaction = await this._stockInTransactionRepository.create(tx, {
            variantId: variant.id,
            stockDate: variantInput.stockDate ?? todayAsIsoDate(),
            totalSetsReceived: variantInput.totalSetsReceived ?? 0,
            notes: variantInput.notes ?? null,
        });

        // save bundles
        await this._saveBundles(tx, transaction.id, variantInput.bundles ?? []);

        // save loose pieces
        await this._saveLoosePieces(tx, transaction.id, variantInput.loosePieces ?? []);

        return transaction;
    }

    async _saveBundles(tx, transactionId, bundles) {
        if (bundles.length === 0) return;

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
}

export default new stockInPersistence();
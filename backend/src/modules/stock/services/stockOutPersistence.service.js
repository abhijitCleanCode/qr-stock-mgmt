import ApiError from "../../../core/apiError.js";

import stockOutTransactionRepository from "../repositories/stockOutTransaction.repository.js";
import stockOutEntryRepository from "../repositories/stockOutEntry.repository.js";
import stockItemRepository from "../repositories/stockItem.repository.js";

class StockOutPersistence {

    _stockOutTransactionRepository = stockOutTransactionRepository;
    _stockOutEntryRepository = stockOutEntryRepository;
    _stockItemRepository = stockItemRepository;

    async createStockOutTransaction(tx, variantInput) {
        // stock_out_transactions.transaction_date is a real timestamp column (unlike Stock In's
        // plain `date` stock_date), so an explicit override must be a Date, not a "YYYY-MM-DD"
        // string — and when the caller doesn't supply one, defaultNow() on the column already
        // handles "now" without us needing to pass anything.
        return this._stockOutTransactionRepository.create(tx, {
            ...(variantInput.stockDate ? { transactionDate: new Date(variantInput.stockDate) } : {}),
            notes: variantInput.retailerName,
        });
    }

    // Consumes exactly `quantity` currently-available SET stock items for this variant.
    // Throws (aborting the whole request's transaction) if fewer are actually in stock —
    // same shape as stockItem.service.js's assembleSet insufficiency check.
    async consumeSets(tx, colorVariantId, quantity) {
        if (quantity <= 0) return [];

        const locked = await this._stockItemRepository.findAndLockAvailableSets(tx, colorVariantId, quantity);
        if (locked.length < quantity) {
            throw new ApiError(`Not enough available SETs to sell: requested ${quantity}, available ${locked.length}.`, 409, "INSUFFICIENT_SET_STOCK");
        }

        const ids = locked.map((item) => item.id);
        await this._stockItemRepository.markConsumed(tx, ids);
        return ids;
    }

    // `bundles` is [{ stockGroupId, quantity }]. Each stockGroupId was already validated to be
    // a BUNDLE group owned by this variant (see stockOutValidator).
    async consumeBundles(tx, bundles) {
        const consumedIds = [];

        for (const { stockGroupId, quantity } of bundles) {
            const locked = await this._stockItemRepository.findAndLockAvailableByStockGroup(tx, stockGroupId, quantity);
            if (locked.length < quantity) {
                throw new ApiError(`Not enough available bundles in stock group ${stockGroupId}: requested ${quantity}, available ${locked.length}.`, 409, "INSUFFICIENT_BUNDLE_STOCK");
            }

            const ids = locked.map((item) => item.id);
            await this._stockItemRepository.markConsumed(tx, ids);
            consumedIds.push(...ids);
        }

        return consumedIds;
    }

    // `loosePieces` is [{ designSizeId, quantity }].
    async consumeLoosePieces(tx, colorVariantId, loosePieces) {
        const consumedIds = [];

        for (const { designSizeId, quantity } of loosePieces) {
            const locked = await this._stockItemRepository.findAndLockAvailableBySize(tx, colorVariantId, designSizeId, quantity);
            if (locked.length < quantity) {
                throw new ApiError(`Not enough available loose pieces for size ${designSizeId}: requested ${quantity}, available ${locked.length}.`, 409, "INSUFFICIENT_LOOSE_PIECES");
            }

            const ids = locked.map((item) => item.id);
            await this._stockItemRepository.markConsumed(tx, ids);
            consumedIds.push(...ids);
        }

        return consumedIds;
    }

    async createEntries(tx, stockOutTransactionId, colorVariantId, delta, unitPrice) {
        const rows = [...delta.entries()].filter(([, quantity]) => quantity > 0).map(([designSizeId, quantity]) => ({
            stockOutTransactionId,
            colorVariantId,
            designSizeId,
            quantity,
            unitPrice,
        }));

        if (rows.length === 0) return [];

        return this._stockOutEntryRepository.createMany(tx, rows);
    }
}

export default new StockOutPersistence();

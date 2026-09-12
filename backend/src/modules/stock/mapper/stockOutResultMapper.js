class StockOutResultMapper {
    map({
        designId,
        variant,
        transaction,
        activeSizes,
        delta,
        updatedInventory,
        variantInput,
    }) {
        const inventoryMap = new Map(updatedInventory.map((row) => [row.designSizeId, row.quantity]));

        return {
            designId,

            colorVariantId: variant.id,

            stockOutTransactionId: transaction.id,

            transactionDate: transaction.transactionDate,

            retailerName: transaction.notes,

            totalSetsSold: variantInput.totalSetsSold ?? 0,

            bundlesSold: variantInput.bundles?.length ?? 0,

            loosePiecesSold: variantInput.loosePieces?.length ?? 0,

            unitPrice: variantInput.unitPrice,

            sizeBreakdown: activeSizes.map((size) => ({
                designSizeId: size.id,
                sizeLabel: size.sizeLabel,
                quantitySold: delta.get(size.id) ?? 0,
                newQuantity: inventoryMap.get(size.id) ?? 0,
            })),
        };
    }
}

export default new StockOutResultMapper();

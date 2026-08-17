class StockInResultMapper {
    map({
        designId,
        variant,
        transaction,
        activeSizes,
        delta,
        updatedInventory,
        variantInput,
        stockGroupId,
        stockItems,
    }) {
        const inventoryMap = new Map(updatedInventory.map((row) => [row.designSizeId, row.quantity]));

        return {
            designId,

            colorVariantId: variant.id,

            stockInTransactionId: transaction.id,

            stockDate: transaction.stockDate,

            totalSetsReceived: transaction.totalSetsReceived,

            bundlesRegistered: input.bundles?.length ?? 0,

            loosePiecesRegistered: input.loosePieces?.length ?? 0,

            sizeBreakdown: activeSizes.map((size) => ({
                designSizeId: size.id,
                sizeLabel: size.sizeLabel,
                quantityAdded: delta.get(size.id) ?? 0,
                newQuantity: inventoryMap.get(size.id) ?? 0,
            })),

            stockGroupId,

            stockItems: stockItems.map((item) => ({
                id: item.id,
                type: item.type,
                status: item.status,
                bundleId: item.bundleId,
            })),
        };
    }
}

export default new StockInResultMapper();

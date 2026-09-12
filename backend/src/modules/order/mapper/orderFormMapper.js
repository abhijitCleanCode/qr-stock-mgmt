// "OF-000158" is never stored — it's the id, formatted, so there's exactly one source of
// truth for order form identity and no counter table to keep in sync.
function formatOrderFormNumber(id) {
    return `OF-${String(id).padStart(6, "0")}`;
}

// Inverse of formatOrderFormNumber, for routes that take the human-readable number (e.g. the
// share link) instead of the internal id. Returns null for anything malformed rather than
// throwing, so callers can turn it into a normal 404 instead of a 500.
function parseOrderFormNumber(orderFormNumber) {
    const match = /^OF-(\d{6})$/.exec(orderFormNumber ?? "");
    return match ? Number(match[1]) : null;
}

// SET: every size actually included in a set gets one piece per set sold (same rule Stock
// In/Out use — see stockInCalculator._addCompleteSets). LOOSE_PIECE: whatever's in the
// stored breakdown for that size, or 0. Every active size for the variant is listed even at
// 0, matching the reference's "S: 2, M: 1, L: 1, XL: 0" style.
function buildSizeBreakdown(item, sizes) {
    if (item.type === "SET") {
        return sizes
            .filter((size) => size.includedInSet)
            .map((size) => ({ designSizeId: size.id, sizeLabel: size.sizeLabel, quantity: item.quantity }));
    }

    const breakdown = item.loosePiecesBreakdown ?? {};
    return sizes.map((size) => ({
        designSizeId: size.id,
        sizeLabel: size.sizeLabel,
        quantity: Number(breakdown[size.id] ?? breakdown[String(size.id)] ?? 0),
    }));
}

function toItemView(item, sizesByVariantId) {
    const sizes = sizesByVariantId.get(item.colorVariantId) ?? [];

    return {
        id: item.id,
        colorVariantId: item.colorVariantId,
        designId: item.designId,
        designCode: item.designCode,
        designName: item.designName,
        colorName: item.colorName,
        colorHex: item.colorHex,
        imageUrl: item.imageUrl,
        type: item.type,
        quantity: item.quantity,
        // Raw, unresolved-to-labels breakdown — kept so the edit form can rebuild its
        // Record<designSizeId, quantity> state without re-deriving it from sizeBreakdown.
        loosePiecesBreakdown: item.loosePiecesBreakdown ?? null,
        sizeBreakdown: buildSizeBreakdown(item, sizes),
        unitPrice: Number(item.unitPrice),
        estimatedValue: Number(item.estimatedValue),
    };
}

// Total Designs counts distinct designs across items (a design with both a Sets row and a
// Loose Pieces row still counts once) — same convention the reference's tile uses.
function summarize(items) {
    const designIds = new Set();
    let totalSets = 0;
    let loosePieces = 0;
    let estimatedValue = 0;

    for (const item of items) {
        designIds.add(item.designId);
        estimatedValue += Number(item.estimatedValue);

        if (item.type === "SET") totalSets += item.quantity;
        else loosePieces += item.quantity;
    }

    return {
        totalDesigns: designIds.size,
        totalSets,
        loosePieces,
        estimatedValue,
    };
}

class OrderFormMapper {
    mapListItem(orderForm, items) {
        return {
            id: orderForm.id,
            orderFormNumber: formatOrderFormNumber(orderForm.id),
            retailerName: orderForm.retailerName,
            contactPerson: orderForm.contactPerson,
            location: orderForm.location,
            orderDate: orderForm.orderDate,
            status: orderForm.status,
            itemCount: items.length,
            summary: summarize(items),
        };
    }

    mapDetail(orderForm, items, sizesByVariantId = new Map()) {
        return {
            id: orderForm.id,
            orderFormNumber: formatOrderFormNumber(orderForm.id),
            retailerName: orderForm.retailerName,
            contactPerson: orderForm.contactPerson,
            location: orderForm.location,
            orderDate: orderForm.orderDate,
            status: orderForm.status,
            notes: orderForm.notes,
            createdAt: orderForm.createdAt,
            updatedAt: orderForm.updatedAt,
            items: items.map((item) => toItemView(item, sizesByVariantId)),
            summary: summarize(items),
        };
    }

    mapPhoto(photo) {
        return {
            id: photo.id,
            orderFormId: photo.orderFormId,
            imageUrl: photo.imageUrl,
            source: photo.source,
            createdAt: photo.createdAt,
        };
    }
}

export default new OrderFormMapper();
export { parseOrderFormNumber };








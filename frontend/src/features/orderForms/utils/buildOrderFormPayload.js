import { getVariantKey } from "@/features/inventory/utils/variantKey";
import { getLoosePiecesTotal } from "@/features/inventory/utils/stockCalculations";

const toBreakdown = (loosePieces) =>
  Object.fromEntries(
    Object.entries(loosePieces)
      .map(([id, quantity]) => [id, Number(quantity)])
      .filter(([, quantity]) => quantity > 0)
  );

// Flattens the per-variant config map into the flat `items` array the Create/Update Order
// Form API expects — one LOOSE_PIECE item per variant, quantity entered manually per size and
// priced per piece (never an auto-multiplied set count).
export function buildOrderFormPayload(header, selectedVariants, configs) {
  const items = [];

  for (const variant of selectedVariants) {
    const config = configs[getVariantKey(variant)];
    if (!config) continue;

    const breakdown = toBreakdown(config.loosePieces);
    if (getLoosePiecesTotal(breakdown) > 0) {
      items.push({
        colorVariantId: config.colorVariantId,
        type: "LOOSE_PIECE",
        loosePiecesBreakdown: breakdown,
        unitPrice: Number(config.looseUnitPrice) || 0,
      });
    }
  }

  return {
    retailerName: header.retailerName,
    contactPerson: header.contactPerson || undefined,
    location: header.location || undefined,
    orderDate: header.orderDate || undefined,
    items,
  };
}

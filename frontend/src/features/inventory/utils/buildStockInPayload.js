import { getVariantKey } from "./variantKey";

const toCompositionArray = (record) =>
  Object.entries(record)
    .map(([designSizeId, quantity]) => ({ designSizeId: Number(designSizeId), quantity: Number(quantity) }))
    .filter((item) => item.quantity > 0);

const hasStock = (config) =>
  config.totalSetsReceived > 0 ||
  config.bundles.some((bundle) => bundle.quantity > 0 && toCompositionArray(bundle.composition).length > 0) ||
  toCompositionArray(config.loosePieces).length > 0;

// Flattens the per-variant config map (keyed by UI-only variantKey) into the
// designs -> variants -> bundles/loosePieces shape the Register Stock In API expects.
// A selected variant nobody entered any stock for is skipped rather than sent empty.
// deliveryDate/challanNo are entered once for the whole registration (see StockIn.jsx) and
// applied identically to every variant entry — stockDate/challanNo are per-transaction fields
// server-side (one stock_in_transaction per variant), so this is how one UI value becomes N.
export function buildStockInPayload(selectedVariants, configs, { deliveryDate, challanNo, printStrategy, qrPerVariantSettings, printOnConfirm, printerId }) {
  const designs = new Map();

  for (const variant of selectedVariants) {
    const key = getVariantKey(variant);
    const config = configs[key];
    if (!config || !hasStock(config)) continue;

    const perVariant = qrPerVariantSettings?.[key] ?? { included: true, childTags: false, tagLoosePieces: true };

    const variantEntry = {
      colorVariantId: config.colorVariantId,
      stockDate: deliveryDate,
      challanNo: challanNo.trim(),
      totalSetsReceived: config.totalSetsReceived,
      bundles: config.bundles
        .filter((bundle) => bundle.quantity > 0)
        .map(({ quantity, composition }) => ({
          quantity,
          composition: toCompositionArray(composition),
        }))
        .filter((bundle) => bundle.composition.length > 0),
      loosePieces: toCompositionArray(config.loosePieces),
      tagging: {
        strategy: printStrategy ?? "parent",
        childTagsEnabled: Boolean(perVariant.childTags),
        tagLoosePieces: Boolean(perVariant.tagLoosePieces),
      },
    };

    if (!designs.has(config.designId)) {
      designs.set(config.designId, []);
    }
    designs.get(config.designId).push(variantEntry);
  }

  return {
    designs: Array.from(designs, ([designId, variants]) => ({ designId, variants })),
    printOnConfirm: Boolean(printOnConfirm),
    ...(printerId ? { printerId } : {}),
  };
}

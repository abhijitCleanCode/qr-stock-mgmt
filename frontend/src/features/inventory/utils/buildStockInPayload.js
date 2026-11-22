import { getVariantKey } from "./variantKey";

const toCompositionArray = (record) =>
  Object.entries(record)
    .map(([designSizeId, quantity]) => ({ designSizeId: Number(designSizeId), quantity: Number(quantity) }))
    .filter((item) => item.quantity > 0);

// Flattens the per-variant config map (keyed by UI-only variantKey) into the
// designs -> variants -> bundles/loosePieces shape the Register Stock In API expects.
// A selected variant nobody entered any stock for is skipped rather than sent empty.
// The jobber delivery (jobber, challan no., issued challan no., date, remarks, defect action) is
// entered once and sent as `challan`; the server stamps it on every variant's stock-in
// transaction. Each variant carries its own QC outcome (defective pieces + category).
// serialStarts: { [variantKey]: { set, piece } } from the QR Tag Studio.
// Tagging: Parent + Child on → "parentChild"; off → "parent" (sets/semi sets still get their
// codes issued, only the pieces aren't individually tagged). Loose tagging is per variant, taken
// from qrPerVariantSettings (StockIn.jsx fills it from the one Loose pieces switch).

// The QC block sent with each variant: the groups the user entered and the result they produce.
// `result` is what the summary shows. Each defect line carries its keep flag: kept pieces are in
// stock as loose pieces, returned pieces are not. The server re-checks `result` from `groups`
// before anything is stored. Size ids are sent as numbers (design size ids).
const buildQcPayload = (breakdown, groups = {}) => {
  if (!breakdown) return null;
  const toId = (value) => Number(value);
  return {
    groups: {
      sets: (groups.sets ?? []).map((group) => ({
        count: group.count,
        designSizeIds: group.sizeIds.map(toId),
        category: group.category,
        keep: Boolean(group.keep),
      })),
      semiSets: (groups.semiSets ?? []).map((group) => ({
        semiKey: group.semiKey,
        count: group.count,
        designSizeIds: group.sizeIds.map(toId),
        category: group.category,
        keep: Boolean(group.keep),
      })),
      loose: (groups.loose ?? []).map((row) => ({
        designSizeId: toId(row.sizeId),
        quantity: row.quantity,
        category: row.category,
        keep: Boolean(row.keep),
      })),
    },
    result: {
      sets: breakdown.sets,
      semiSets: breakdown.semiSets.map((semiSet) => ({
        semiKey: semiSet.key,
        designSizeIds: semiSet.sizeIds.map(toId),
        quantity: semiSet.quantity,
      })),
      newSemiSets: breakdown.newSemiSets.map((semiSet) => ({
        designSizeIds: semiSet.sizeIds.map(toId),
        quantity: semiSet.quantity,
      })),
      loose: Object.entries(breakdown.loose)
        .filter(([, quantity]) => quantity > 0)
        .map(([sizeId, quantity]) => ({ designSizeId: toId(sizeId), quantity })),
      defectLines: breakdown.defectLines.map((line) => ({
        source: line.source,
        designSizeId: toId(line.sizeId),
        category: line.category,
        keep: Boolean(line.keep),
        semiSetKey: line.semiSetKey ?? null,
      })),
      returnedCount: breakdown.returnedCount,
    },
  };
};

// The stock a variant registers, taken from the final QC result rather than the original counts:
// full sets and semi sets left after defects (including semi sets formed from broken sets), and
// loose pieces left after defects. The breakdown already counts kept defects as loose pieces and
// leaves returned ones out.
export function finalStockFor(breakdown) {
  const semiBundle = (semiSet) => ({
    quantity: semiSet.quantity,
    composition: semiSet.sizeIds.map((sizeId) => ({ designSizeId: Number(sizeId), quantity: 1 })),
  });
  return {
    totalSetsReceived: breakdown.sets,
    bundles: [...breakdown.semiSets, ...breakdown.newSemiSets].map(semiBundle).filter((bundle) => bundle.quantity > 0),
    loosePieces: Object.entries(breakdown.loose)
      .filter(([, quantity]) => quantity > 0)
      .map(([sizeId, quantity]) => ({ designSizeId: Number(sizeId), quantity })),
  };
}

const hasFinalStock = (stock) => stock.totalSetsReceived > 0 || stock.bundles.length > 0 || stock.loosePieces.length > 0;

export function buildStockInPayload(
  selectedVariants,
  configs,
  { challan, tagParentChild, qrPerVariantSettings, qcByKey, qcGroupsByKey, breakdownByKey, printOnConfirm, printerId, serialStarts },
) {
  const designs = new Map();

  for (const variant of selectedVariants) {
    const key = getVariantKey(variant);
    const config = configs[key];
    if (!config) continue;

    const breakdown = breakdownByKey?.[key];
    // Without a QC result (no QC step reached), the stock is the Set Matrix entry as it was.
    const stock = breakdown
      ? finalStockFor(breakdown)
      : {
          totalSetsReceived: config.totalSetsReceived,
          bundles: config.bundles
            .filter((bundle) => bundle.quantity > 0)
            .map(({ quantity, composition }) => ({ quantity, composition: toCompositionArray(composition) }))
            .filter((bundle) => bundle.composition.length > 0),
          loosePieces: toCompositionArray(config.loosePieces),
        };
    if (!hasFinalStock(stock)) continue;

    const perVariant = qrPerVariantSettings?.[key] ?? { included: true, childTags: false, tagLoosePieces: true };

    const defects = Number(qcByKey?.[key]?.defects) || 0;

    const variantEntry = {
      colorVariantId: config.colorVariantId,
      defectivePieces: defects,
      ...(defects > 0 ? { defectCategory: qcByKey[key].category } : {}),
      qc: buildQcPayload(breakdown, qcGroupsByKey?.[key]),
      // The final stock: what the database stores and the stock items and tags are built from.
      totalSetsReceived: stock.totalSetsReceived,
      bundles: stock.bundles,
      loosePieces: stock.loosePieces,
      tagging: {
        strategy: tagParentChild ? "parentChild" : "parent",
        childTagsEnabled: Boolean(perVariant.childTags),
        tagLoosePieces: Boolean(perVariant.tagLoosePieces),
      },
      // First serials the labels were printed with — the server rejects the inward if another
      // one has used those numbers since.
      ...(serialStarts?.[key] ? { serialStart: serialStarts[key] } : {}),
    };

    if (!designs.has(config.designId)) {
      designs.set(config.designId, []);
    }
    designs.get(config.designId).push(variantEntry);
  }

  return {
    challan,
    designs: Array.from(designs, ([designId, variants]) => ({ designId, variants })),
    printOnConfirm: Boolean(printOnConfirm),
    ...(printerId ? { printerId } : {}),
  };
}

// Turns the defects recorded in QC into the resulting stock for one colour variant.
//
// Each defective piece is either KEPT (factory seconds) or RETURNED (to the jobber). The choice is
// made per defect group. The re-sorting is the same either way:
// - A full set with defective pieces breaks up.
//   - Exactly 3 pieces remain: they form a semi-set with those sizes (created automatically when
//     it doesn't exist yet, returned as `newSemiSets`).
//   - Any other number remaining: the remaining pieces become loose pieces.
// - A semi-set with defective pieces breaks up. Its remaining pieces become loose pieces.
// - A kept defective piece becomes a loose piece of its size (it is stock, as seconds).
// - A returned defective piece leaves stock.
// - A defective loose piece that is kept stays loose; one that is returned leaves stock.
// - Every defective piece becomes one defect line with its size, category and keep flag.
//
// Inputs
//   setSizeIds     sizes making up one full set, one piece each
//   setsReceived   number of full sets received
//   semiSets       [{ key, sizeIds, quantity }] semi-sets received, quantity = instances
//   loose          { [sizeId]: count } loose pieces received
//   brokenSets     [{ defects: { [sizeId]: category }, keep }] one entry per full set with defects
//   brokenSemiSets [{ key, defects: { [sizeId]: category }, keep }] one entry per semi-set with defects
//   looseDefects   [{ sizeId, quantity, category, keep }] defective loose pieces
//
// A missing `keep` counts as returned. The screen always sets it explicitly.
//
// Output
//   errors, sets, semiSets, newSemiSets, loose (the stock), defectLines, defectiveCount,
//   keptCount, returnedCount

const SEMI_SET_PIECES = 3;

const keysOf = (object) => Object.keys(object ?? {});
const hasCategory = (category) => typeof category === "string" && category.trim().length > 0;

export function computeDefectBreakdown({
  setSizeIds = [],
  setsReceived = 0,
  semiSets = [],
  loose = {},
  brokenSets = [],
  brokenSemiSets = [],
  looseDefects = [],
} = {}) {
  // Size ids may arrive as numbers from the server, but object keys (defects, loose counts) are
  // always strings, so every size id is compared as a string.
  const sizeKey = (sizeId) => String(sizeId);
  setSizeIds = setSizeIds.map(sizeKey);
  semiSets = semiSets.map((semiSet) => ({ ...semiSet, sizeIds: semiSet.sizeIds.map(sizeKey) }));
  loose = Object.fromEntries(Object.entries(loose).map(([sizeId, quantity]) => [sizeKey(sizeId), quantity]));
  looseDefects = looseDefects.map((defect) => ({ ...defect, sizeId: sizeKey(defect.sizeId) }));

  const errors = [];
  const defectLines = [];
  const newSemiSets = [];
  const remainingLoose = { ...loose };
  const remainingSemiSets = semiSets.map((semiSet) => ({ ...semiSet }));

  const addLoose = (sizeId, quantity) => {
    remainingLoose[sizeId] = (remainingLoose[sizeId] ?? 0) + quantity;
  };

  if (brokenSets.length > setsReceived) {
    errors.push(`${brokenSets.length} sets marked defective, but only ${setsReceived} were received.`);
  }

  // Full sets
  brokenSets.forEach((set, index) => {
    const keep = Boolean(set.keep);
    const removed = keysOf(set.defects);
    if (removed.length === 0) {
      errors.push(`Set ${index + 1} is marked defective but has no defective piece.`);
      return;
    }
    const validRemoved = [];
    for (const sizeId of removed) {
      if (!setSizeIds.includes(sizeId)) {
        errors.push(`Size ${sizeId} is not part of the full set.`);
        continue;
      }
      if (!hasCategory(set.defects[sizeId])) errors.push(`Pick a defect category for the defective piece in set ${index + 1}.`);
      validRemoved.push(sizeId);
      defectLines.push({ sizeId, category: set.defects[sizeId], source: "SET", keep });
    }

    const remainingSizes = setSizeIds.filter((sizeId) => !removed.includes(sizeId));
    if (remainingSizes.length === SEMI_SET_PIECES) {
      newSemiSets.push({ sizeIds: remainingSizes });
    } else {
      remainingSizes.forEach((sizeId) => addLoose(sizeId, 1));
    }
    if (keep) validRemoved.forEach((sizeId) => addLoose(sizeId, 1));
  });

  // Semi-sets
  brokenSemiSets.forEach((broken) => {
    const keep = Boolean(broken.keep);
    const semiSet = remainingSemiSets.find((item) => item.key === broken.key);
    if (!semiSet) {
      errors.push(`Semi-set ${broken.key} is not part of this variant.`);
      return;
    }
    if (semiSet.quantity <= 0) {
      errors.push(`No semi-sets of ${broken.key} left to mark defective.`);
      return;
    }

    const removed = keysOf(broken.defects);
    if (removed.length === 0) {
      errors.push(`A semi-set marked defective has no defective piece.`);
      return;
    }
    const validRemoved = [];
    for (const sizeId of removed) {
      if (!semiSet.sizeIds.includes(sizeId)) {
        errors.push(`Size ${sizeId} is not part of semi-set ${broken.key}.`);
        continue;
      }
      if (!hasCategory(broken.defects[sizeId])) errors.push(`Pick a defect category for the defective piece in semi-set ${broken.key}.`);
      validRemoved.push(sizeId);
      defectLines.push({ sizeId, category: broken.defects[sizeId], source: "SEMI", semiSetKey: broken.key, keep });
    }

    semiSet.quantity -= 1;
    semiSet.sizeIds.filter((sizeId) => !removed.includes(sizeId)).forEach((sizeId) => addLoose(sizeId, 1));
    if (keep) validRemoved.forEach((sizeId) => addLoose(sizeId, 1));
  });

  // Loose pieces: a kept defect is already in stock as loose, so only a returned one leaves it.
  looseDefects.forEach((defect) => {
    if (!(defect.quantity > 0)) return;
    const keep = Boolean(defect.keep);
    const available = remainingLoose[defect.sizeId] ?? 0;
    if (defect.quantity > available) {
      errors.push(`Only ${available} loose piece(s) of size ${defect.sizeId} are available.`);
      return;
    }
    if (!hasCategory(defect.category)) errors.push(`Pick a defect category for the defective loose pieces.`);
    if (!keep) remainingLoose[defect.sizeId] = available - defect.quantity;
    for (let index = 0; index < defect.quantity; index += 1) {
      defectLines.push({ sizeId: defect.sizeId, category: defect.category, source: "LOOSE", keep });
    }
  });

  const keptCount = defectLines.filter((line) => line.keep).length;

  return {
    errors,
    sets: setsReceived - brokenSets.length,
    semiSets: remainingSemiSets.filter((semiSet) => semiSet.quantity > 0),
    newSemiSets,
    loose: remainingLoose,
    defectLines,
    defectiveCount: defectLines.length,
    keptCount,
    returnedCount: defectLines.length - keptCount,
  };
}

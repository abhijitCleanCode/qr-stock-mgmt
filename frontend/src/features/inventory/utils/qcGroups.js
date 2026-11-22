// QC for one colour variant, entered as groups.
//
// A group is "N sets (or semi sets) that share the same defective sizes and the same category".
// Loose pieces are one row per size. Everything the screen shows after the defects (remaining
// sets, semi sets, loose pieces, the defective count) is derived here, from the groups and the
// Set Matrix totals, using the rules in defectBreakdown.js.
//
// Inputs
//   setSizeIds       sizes making up one full set, one piece each
//   setsReceived     number of full sets received
//   semiSetTypes     [{ key, sizeIds, quantity }] semi sets received (key = bundle index)
//   loose            { [sizeId]: count } loose pieces received
//   groups           { sets: [{ count, sizeIds, category }],
//                      semiSets: [{ semiKey, count, sizeIds, category }],
//                      loose: [{ sizeId, quantity, category }] }
//   catalogSemiSets  [sizeIds] semi sets already defined for this design
//   registeredSemiSets [{ sizeIds }] new semi sets the user registered for this inward
//
// Output
//   errors, sets, semiSets, loose, defectLines, defectiveCount, defectBySource,
//   newSemiSets [{ sizeIds, quantity, registered }]

import { computeDefectBreakdown } from "./defectBreakdown.js";

const signature = (sizeIds) => [...sizeIds].map(String).sort().join("-");

const repeat = (count, make) => Array.from({ length: Math.max(0, Number(count) || 0) }, make);

const defectsFor = (sizeIds, category) => Object.fromEntries(sizeIds.map((sizeId) => [String(sizeId), category]));

export function computeVariantQc({
  setSizeIds = [],
  setsReceived = 0,
  semiSetTypes = [],
  loose = {},
  groups = {},
  catalogSemiSets = [],
  registeredSemiSets = [],
} = {}) {
  const brokenSets = (groups.sets ?? []).flatMap((group) =>
    repeat(group.count, () => ({ defects: defectsFor(group.sizeIds ?? [], group.category), keep: Boolean(group.keep) })),
  );
  const brokenSemiSets = (groups.semiSets ?? []).flatMap((group) =>
    repeat(group.count, () => ({ key: group.semiKey, defects: defectsFor(group.sizeIds ?? [], group.category), keep: Boolean(group.keep) })),
  );
  const looseDefects = (groups.loose ?? [])
    .filter((row) => Number(row.quantity) > 0)
    .map((row) => ({ sizeId: String(row.sizeId), quantity: Number(row.quantity), category: row.category, keep: Boolean(row.keep) }));

  const breakdown = computeDefectBreakdown({
    setSizeIds,
    setsReceived,
    semiSets: semiSetTypes,
    loose,
    brokenSets,
    brokenSemiSets,
    looseDefects,
  });

  // Remainders that formed a 3-piece semi set, counted per distinct size combination.
  const knownSignatures = new Set([
    ...catalogSemiSets.map(signature),
    ...semiSetTypes.map((type) => signature(type.sizeIds)),
    ...registeredSemiSets.map((semiSet) => signature(semiSet.sizeIds)),
  ]);
  const newSemiSetMap = new Map();
  for (const semiSet of breakdown.newSemiSets) {
    const key = signature(semiSet.sizeIds);
    const existing = newSemiSetMap.get(key);
    if (existing) existing.quantity += 1;
    else newSemiSetMap.set(key, { sizeIds: semiSet.sizeIds, quantity: 1, registered: knownSignatures.has(key) });
  }

  const defectBySource = { SET: 0, SEMI: 0, LOOSE: 0 };
  for (const line of breakdown.defectLines) defectBySource[line.source] += 1;

  return {
    errors: breakdown.errors,
    sets: breakdown.sets,
    semiSets: breakdown.semiSets,
    loose: breakdown.loose,
    defectLines: breakdown.defectLines,
    defectiveCount: breakdown.defectiveCount,
    defectBySource,
    newSemiSets: [...newSemiSetMap.values()],
  };
}

// Adds a registered semi set, ignoring duplicates. Sizes are kept in the set's own order.
export function registerSemiSet(registered, sizeIds, setSizeIds) {
  const wanted = signature(sizeIds);
  if (registered.some((semiSet) => signature(semiSet.sizeIds) === wanted)) return registered;
  const ordered = [...setSizeIds].map(String).filter((sizeId) => sizeIds.map(String).includes(sizeId));
  return [...registered, { sizeIds: ordered }];
}

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeDefectBreakdown } from "./defectBreakdown.js";

const SET = ["S", "M", "L", "XL"];

test("one defective piece in a full set makes the remaining 3 a new semi-set", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { M: "Oil stain on collar" } }],
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.sets, 0);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["S", "L", "XL"] }]);
  assert.deepEqual(result.loose, {});
  assert.deepEqual(result.defectLines, [{ sizeId: "M", category: "Oil stain on collar", source: "SET", keep: false }]);
});

test("two defective pieces in a full set leave 2 loose pieces, no semi-set", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { M: "Zari thread cut", L: "Size tag mismatch" } }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.newSemiSets, []);
  assert.deepEqual(result.loose, { S: 1, XL: 1 });
  assert.equal(result.defectiveCount, 2);
});

test("a defective piece in a semi-set leaves its remaining pieces loose", () => {
  const result = computeDefectBreakdown({
    setsReceived: 0,
    semiSets: [{ key: "S-M-L", sizeIds: ["S", "M", "L"], quantity: 2 }],
    brokenSemiSets: [{ key: "S-M-L", defects: { M: "Stitching unevenness" } }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.semiSets, [{ key: "S-M-L", sizeIds: ["S", "M", "L"], quantity: 1 }]);
  assert.deepEqual(result.loose, { S: 1, L: 1 });
  assert.deepEqual(result.defectLines, [{ sizeId: "M", category: "Stitching unevenness", source: "SEMI", semiSetKey: "S-M-L", keep: false }]);
});

test("a defective loose piece only lowers the loose count for its size", () => {
  const result = computeDefectBreakdown({
    loose: { M: 2 },
    looseDefects: [{ sizeId: "M", quantity: 1, category: "Other (see remarks)" }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.loose, { M: 1 });
  assert.deepEqual(result.defectLines, [{ sizeId: "M", category: "Other (see remarks)", source: "LOOSE", keep: false }]);
});

test("a 5-piece set with one defective piece leaves 4 loose pieces, not a semi-set", () => {
  const result = computeDefectBreakdown({
    setSizeIds: ["S", "M", "L", "XL", "XXL"],
    setsReceived: 1,
    brokenSets: [{ defects: { M: "Oil stain on collar" } }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.newSemiSets, []);
  assert.deepEqual(result.loose, { S: 1, L: 1, XL: 1, XXL: 1 });
});

test("a 5-piece set with two defective pieces leaves a 3-piece semi-set", () => {
  const result = computeDefectBreakdown({
    setSizeIds: ["S", "M", "L", "XL", "XXL"],
    setsReceived: 1,
    brokenSets: [{ defects: { M: "Oil stain on collar", XL: "Zari thread cut" } }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["S", "L", "XXL"] }]);
  assert.deepEqual(result.loose, {});
});

test("numeric size ids from the server work the same as string keys", () => {
  const result = computeDefectBreakdown({
    setSizeIds: [11, 12, 13, 14],
    setsReceived: 1,
    brokenSets: [{ defects: { 12: "Oil stain on collar" } }],
    loose: { 11: 2 },
    looseDefects: [{ sizeId: 11, quantity: 1, category: "Zari thread cut" }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["11", "13", "14"] }]);
  assert.deepEqual(result.loose, { 11: 1 });
  assert.equal(result.defectiveCount, 2);
});

test("only the broken set changes when several sets arrive", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 3,
    brokenSets: [{ defects: { S: "Oil stain on collar" } }],
  });

  assert.equal(result.sets, 2);
  assert.equal(result.newSemiSets.length, 1);
});

test("more defective sets than sets received is an error", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { S: "Oil stain on collar" } }, { defects: { S: "Oil stain on collar" } }],
  });

  assert.ok(result.errors.some((message) => message.includes("only 1 were received")));
});

test("loose defects above the loose count are rejected", () => {
  const result = computeDefectBreakdown({
    loose: { M: 1 },
    looseDefects: [{ sizeId: "M", quantity: 2, category: "Other (see remarks)" }],
  });

  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.loose, { M: 1 });
});

test("a defective piece without a category is an error", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { M: "" } }],
  });

  assert.ok(result.errors.some((message) => message.includes("defect category")));
});

test("a size that is not part of the set is an error", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { XXL: "Oil stain on collar" } }],
  });

  assert.ok(result.errors.some((message) => message.includes("XXL")));
});

test("a kept defective piece from a set stays in stock as a loose piece, and the set breaks", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 1,
    brokenSets: [{ defects: { L: "Oil stain on collar" }, keep: true }],
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["S", "M", "XL"] }]);
  assert.deepEqual(result.loose, { L: 1 });
  assert.equal(result.keptCount, 1);
  assert.equal(result.returnedCount, 0);
});

test("a kept defective piece from a semi-set becomes loose, with the rest of the semi-set", () => {
  const result = computeDefectBreakdown({
    semiSets: [{ key: "S-M-L", sizeIds: ["S", "M", "L"], quantity: 1 }],
    brokenSemiSets: [{ key: "S-M-L", defects: { M: "Zari thread cut" }, keep: true }],
  });

  assert.deepEqual(result.semiSets, []);
  assert.deepEqual(result.loose, { S: 1, M: 1, L: 1 });
});

test("a returned defective piece from a semi-set leaves stock, the rest become loose", () => {
  const result = computeDefectBreakdown({
    semiSets: [{ key: "S-M-L", sizeIds: ["S", "M", "L"], quantity: 1 }],
    brokenSemiSets: [{ key: "S-M-L", defects: { M: "Zari thread cut" }, keep: false }],
  });

  assert.deepEqual(result.loose, { S: 1, L: 1 });
  assert.equal(result.returnedCount, 1);
});

test("kept and returned defects can be mixed in one inward", () => {
  const result = computeDefectBreakdown({
    setSizeIds: SET,
    setsReceived: 2,
    semiSets: [{ key: "0", sizeIds: ["S", "M", "L"], quantity: 1 }],
    loose: { M: 1, L: 1 },
    brokenSets: [{ defects: { L: "Oil stain on collar" }, keep: true }],
    brokenSemiSets: [{ key: "0", defects: { M: "Zari thread cut" }, keep: false }],
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.sets, 1);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["S", "M", "XL"] }]);
  assert.deepEqual(result.loose, { S: 1, L: 3, M: 1 });
  assert.equal(result.keptCount, 1);
  assert.equal(result.returnedCount, 1);
});

test("a kept defective loose piece stays in stock; a returned one leaves it", () => {
  const kept = computeDefectBreakdown({
    loose: { M: 2 },
    looseDefects: [{ sizeId: "M", quantity: 1, category: "Other (see remarks)", keep: true }],
  });
  const returned = computeDefectBreakdown({
    loose: { M: 2 },
    looseDefects: [{ sizeId: "M", quantity: 1, category: "Other (see remarks)", keep: false }],
  });

  assert.deepEqual(kept.loose, { M: 2 });
  assert.deepEqual(returned.loose, { M: 1 });
});

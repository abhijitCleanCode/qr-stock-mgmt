import { test } from "node:test";
import assert from "node:assert/strict";

import { computeVariantQc, registerSemiSet } from "./qcGroups.js";

const SET = ["S", "M", "L", "XL"];

test("a group of two sets with M defective makes two new S-L-XL semi sets", () => {
  const result = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 2,
    groups: { sets: [{ count: 2, sizeIds: ["M"], category: "Oil stain on collar" }] },
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.sets, 0);
  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["S", "L", "XL"], quantity: 2, registered: false }]);
  assert.deepEqual(result.defectBySource, { SET: 2, SEMI: 0, LOOSE: 0 });
  assert.equal(result.defectiveCount, 2);
});

test("a remainder that matches a catalogue semi set is marked registered", () => {
  const result = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    catalogSemiSets: [["L", "XL", "S"]],
    groups: { sets: [{ count: 1, sizeIds: ["M"], category: "Zari thread cut" }] },
  });

  assert.equal(result.newSemiSets[0].registered, true);
});

test("a remainder registered in this inward is marked registered", () => {
  const result = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    registeredSemiSets: [{ sizeIds: ["M", "L", "XL"] }],
    groups: { sets: [{ count: 1, sizeIds: ["S"], category: "Zari thread cut" }] },
  });

  assert.deepEqual(result.newSemiSets, [{ sizeIds: ["M", "L", "XL"], quantity: 1, registered: true }]);
});

test("a set with two defective sizes leaves two loose pieces, no semi set", () => {
  const result = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    groups: { sets: [{ count: 1, sizeIds: ["M", "L"], category: "Stitching rip on sleeve" }] },
  });

  assert.deepEqual(result.newSemiSets, []);
  assert.deepEqual(result.loose, { S: 1, XL: 1 });
});

test("a defective semi set leaves its remaining pieces loose", () => {
  const result = computeVariantQc({
    semiSetTypes: [{ key: "0", sizeIds: ["S", "M", "L"], quantity: 2 }],
    groups: { semiSets: [{ semiKey: "0", count: 1, sizeIds: ["M"], category: "Other (see remarks)" }] },
  });

  assert.deepEqual(result.semiSets, [{ key: "0", sizeIds: ["S", "M", "L"], quantity: 1 }]);
  assert.deepEqual(result.loose, { S: 1, L: 1 });
  assert.deepEqual(result.defectBySource, { SET: 0, SEMI: 1, LOOSE: 0 });
});

test("loose pieces are counted by size and source", () => {
  const result = computeVariantQc({
    loose: { M: 3 },
    groups: { loose: [{ sizeId: "M", quantity: 2, category: "Size tag mismatch" }] },
  });

  assert.deepEqual(result.loose, { M: 1 });
  assert.deepEqual(result.defectBySource, { SET: 0, SEMI: 0, LOOSE: 2 });
});

test("a group without a size or without a category is an error", () => {
  const noSize = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    groups: { sets: [{ count: 1, sizeIds: [], category: "Zari thread cut" }] },
  });
  const noCategory = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    groups: { sets: [{ count: 1, sizeIds: ["M"], category: "" }] },
  });

  assert.equal(noSize.errors.length, 1);
  assert.ok(noCategory.errors.some((message) => message.includes("defect category")));
});

test("more defective sets than sets received is an error", () => {
  const result = computeVariantQc({
    setSizeIds: SET,
    setsReceived: 1,
    groups: { sets: [{ count: 2, sizeIds: ["M"], category: "Zari thread cut" }] },
  });

  assert.ok(result.errors.some((message) => message.includes("only 1 were received")));
});

test("registerSemiSet keeps sizes in set order and ignores duplicates", () => {
  let registered = registerSemiSet([], ["XL", "M", "L"], SET);
  registered = registerSemiSet(registered, ["L", "M", "XL"], SET);

  assert.deepEqual(registered, [{ sizeIds: ["M", "L", "XL"] }]);
});

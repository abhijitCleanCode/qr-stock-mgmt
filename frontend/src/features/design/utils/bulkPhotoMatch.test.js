import { test } from "node:test";
import assert from "node:assert/strict";

import { editDistance, matchPhotos, normalizeKey } from "./bulkPhotoMatch.js";

const variants = [
  { colorVariantId: 1, designCode: "KP 557", colorName: "Yellow", hasPhoto: false },
  { colorVariantId: 2, designCode: "KP 557", colorName: "Violet", hasPhoto: false },
  { colorVariantId: 3, designCode: "C 153", colorName: "Rust", hasPhoto: true },
  { colorVariantId: 4, designCode: "C 15", colorName: "Red", hasPhoto: false },
  { colorVariantId: 5, designCode: "C 155", colorName: "Red", hasPhoto: false },
];

test("normalizeKey ignores case, spaces and punctuation", () => {
  assert.equal(normalizeKey("KP 557-Yellow"), "kp557yellow");
  assert.equal(normalizeKey("kp557_YELLOW"), "kp557yellow");
});

test("editDistance counts single-character edits", () => {
  assert.equal(editDistance("yellow", "yelow"), 1);
  assert.equal(editDistance("violet", "violet"), 0);
  assert.equal(editDistance("abc", "xyz"), 3);
});

test("exact names match whatever their punctuation and case", () => {
  const r = matchPhotos(["KP 557-Yellow.jpg", "kp557_violet.PNG"], variants);
  assert.deepEqual(r.matched.map((m) => m.variant.colorVariantId), [1, 2]);
  assert.equal(r.suggested.length, 0);
});

test("a one-letter typo in a longer name is suggested, not matched", () => {
  const r = matchPhotos(["KP 557-Yelow.jpg"], variants);
  assert.equal(r.matched.length, 0);
  assert.equal(r.suggested.length, 1);
  assert.equal(r.suggested[0].variant.colorVariantId, 1);
  assert.equal(r.suggested[0].typos, 1);
});

test("short names never match loosely", () => {
  // "C15R" is 4 characters after normalising, so it must not be guessed as "C 15 Red".
  const r = matchPhotos(["C 15-R.jpg"], variants);
  assert.equal(r.suggested.length, 0);
  assert.equal(r.unmatched.length, 1);
});

test("a 7-character name with one typo is suggested", () => {
  const r = matchPhotos(["C 15-Redd.jpg"], variants);
  assert.equal(r.suggested[0].variant.colorVariantId, 4);
});

test("a name that fits two variants equally well is ambiguous", () => {
  const twins = [
    { colorVariantId: 10, designCode: "AB 100", colorName: "Blue", hasPhoto: false },
    { colorVariantId: 11, designCode: "AB 100", colorName: "Blus", hasPhoto: false },
  ];
  const r = matchPhotos(["AB 100-Blur.jpg"], twins);
  assert.equal(r.ambiguous.length, 1);
  assert.equal(r.ambiguous[0].variants.length, 2);
});

test("two photos for one variant: the second is reported as a duplicate", () => {
  const r = matchPhotos(["KP 557-Yellow.jpg", "KP557 yellow (1).jpg"], variants);
  assert.equal(r.matched.length, 1);
  assert.equal(r.duplicates.length, 1);
});

test("non-image files are skipped and variants without photos are listed", () => {
  const r = matchPhotos(["notes.txt", "C 153-Rust.jpg"], variants);
  assert.deepEqual(r.skipped, ["notes.txt"]);
  // C 153 Rust already has a photo, so it isn't listed; everything else still needs one.
  assert.deepEqual(r.withoutPhoto.map((v) => v.colorVariantId), [1, 2, 4, 5]);
});

test("unknown names are unmatched", () => {
  const r = matchPhotos(["ZZ 999-Pink.jpg"], variants);
  assert.deepEqual(r.unmatched, ["ZZ 999-Pink.jpg"]);
});

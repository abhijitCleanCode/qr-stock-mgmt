import { test } from "node:test";
import assert from "node:assert/strict";

import { BULK_MAX_DESIGNS, BULK_TEMPLATE_CSV, FALLBACK_COLOR_HEX, buildBulkPlan, colorHexFor, parseCsv, parseSemiSets, parseSizes } from "./bulkDesignImport.js";

const PLACEHOLDER = { name: "photo-pending.png" };
const HEADER = "design_code,pattern,item_name,quality,jobber,selling_price,notes,color_name,color_hex,sizes,semi_sets";
const row = (overrides = {}) => {
  const values = {
    design_code: "kp100",
    pattern: "Anarkali",
    item_name: "Tunic",
    quality: "Cotton",
    jobber: "Ramesh Tailors",
    selling_price: "850",
    notes: "",
    color_name: "Red",
    color_hex: "",
    sizes: "S;M;L",
    semi_sets: "Top:S;M",
    ...overrides,
  };
  return Object.values(values).join(",");
};
const csv = (...rows) => [HEADER, ...rows].join("\n");

test("parseCsv handles quoted commas, doubled quotes and CRLF line endings", () => {
  const records = parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n');
  assert.deepEqual(records, [["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
});

test("parseSizes trims and drops empty entries", () => {
  assert.deepEqual(parseSizes(" S; M ;L;"), ["S", "M", "L"]);
  assert.deepEqual(parseSizes(""), []);
});

test("parseSemiSets reads name:sizes groups and reports malformed ones", () => {
  assert.deepEqual(parseSemiSets("Top:S;M|Bottom:L;XL"), {
    semiSets: [
      { label: "Top", sizeLabels: ["S", "M"] },
      { label: "Bottom", sizeLabels: ["L", "XL"] },
    ],
    errors: [],
  });
  assert.equal(parseSemiSets("Top S;M").errors.length, 1);
});

test("colour hex comes from the colour name, with a grey fallback for unknown names", () => {
  assert.equal(colorHexFor("Red"), "#C0392B");
  assert.equal(colorHexFor("  navy  "), "#1B2A4A");
  assert.equal(colorHexFor("Sea Foam Shimmer"), FALLBACK_COLOR_HEX);
});

test("a clean design becomes the register payload, with the placeholder on every variant", () => {
  const plan = buildBulkPlan(csv(row(), row({ color_name: "Blue" })), PLACEHOLDER);
  assert.deepEqual(plan.fileErrors, []);
  assert.equal(plan.designs.length, 1);
  const [design] = plan.designs;
  assert.deepEqual(design.errors, []);
  assert.equal(design.payload.code, "kp100");
  assert.equal(design.payload.name, "Anarkali");
  assert.equal(design.payload.itemName, "Tunic");
  assert.equal(design.payload.defaultSellingPricePerPiece, 850);
  assert.deepEqual(design.payload.colorVariants, [
    { colorName: "Red", colorHex: "#C0392B" },
    { colorName: "Blue", colorHex: "#1F3A93" },
  ]);
  assert.deepEqual(design.payload.designSizes.map((s) => s.sizeLabel), ["S", "M", "L"]);
  assert.deepEqual(design.payload.semiSets, [{ label: "Top", displayOrder: 0, sizeLabels: ["S", "M"] }]);
  assert.equal(design.payload.images.length, 2);
  assert.ok(design.payload.images.every((image) => image === PLACEHOLDER));
});

test("a typed colour hex overrides the one from the colour name", () => {
  const plan = buildBulkPlan(csv(row({ color_hex: "#123456" })), PLACEHOLDER);
  assert.deepEqual(plan.designs[0].payload.colorVariants, [{ colorName: "Red", colorHex: "#123456" }]);
});

test("an unknown colour name without a hex gets the grey fallback and is still imported", () => {
  const plan = buildBulkPlan(csv(row({ color_name: "Sea Foam" })), PLACEHOLDER);
  assert.deepEqual(plan.designs[0].errors, []);
  assert.equal(plan.designs[0].payload.colorVariants[0].colorHex, FALLBACK_COLOR_HEX);
});

test("rows are grouped by design code, ignoring case and surrounding spaces", () => {
  const plan = buildBulkPlan(csv(row({ color_name: "Red" }), row({ design_code: " KP100 ", color_name: "Blue" })), PLACEHOLDER);
  assert.equal(plan.designs.length, 1);
  assert.equal(plan.designs[0].rowCount, 2);
});

test("a malformed typed hex is an error on that design", () => {
  const plan = buildBulkPlan(csv(row({ color_hex: "C0392B" })), PLACEHOLDER);
  assert.match(plan.designs[0].errors.join(" "), /colour hex must look like/);
});

test("design-level fields must match on every row", () => {
  const plan = buildBulkPlan(csv(row(), row({ color_name: "Blue", pattern: "Straight" })), PLACEHOLDER);
  assert.match(plan.designs[0].errors.join(" "), /Pattern should be the same on every row/);
});

test("bad price, duplicate colour and unknown semi-set size are all reported", () => {
  const plan = buildBulkPlan(csv(row({ selling_price: "8.5", semi_sets: "Top:S;XXL" }), row({ color_name: "red" })), PLACEHOLDER);
  const messages = plan.designs[0].errors.join("\n");
  assert.match(messages, /Selling price must be a whole number/);
  assert.match(messages, /Semi set "Top" uses sizes not in the design: XXL/);
  assert.match(messages, /appears twice/);
});

test("letters-only name rules apply to pattern, item name, quality and jobber", () => {
  const plan = buildBulkPlan(csv(row({ pattern: "Anarkali 2", item_name: "", quality: "Cot+on", jobber: "R1" })), PLACEHOLDER);
  const messages = plan.designs[0].errors.join("\n");
  assert.match(messages, /Pattern can contain letters only/);
  assert.match(messages, /Item name is required/);
  assert.match(messages, /Quality can contain letters only/);
  assert.match(messages, /Jobber can contain letters only/);
});

test("a design code needs both letters and digits", () => {
  const plan = buildBulkPlan(csv(row({ design_code: "kurti" })), PLACEHOLDER);
  assert.match(plan.designs[0].errors.join(" "), /must contain both letters and numbers/);
});

test("more than the batch limit of designs is refused for the whole file", () => {
  const rows = Array.from({ length: BULK_MAX_DESIGNS + 1 }, (_, index) => row({ design_code: `kp${index + 1}` }));
  const plan = buildBulkPlan(csv(...rows), PLACEHOLDER);
  assert.equal(plan.fileErrors.length, 1);
  assert.match(plan.fileErrors[0], /Import at most 100/);
});

test("missing columns stop the plan with a clear message", () => {
  const plan = buildBulkPlan("design_code,pattern\nkp100,Anarkali\n", PLACEHOLDER);
  assert.match(plan.fileErrors[0], /missing these columns: item_name, quality, selling_price, color_name, sizes/);
});

test("headers are matched loosely", () => {
  const header = "Design Code,Pattern,Item Name,Quality,Jobber,Selling Price,Notes,Color Name,Color Hex,Sizes,Semi Sets";
  const plan = buildBulkPlan([header, row()].join("\n"), PLACEHOLDER);
  assert.deepEqual(plan.fileErrors, []);
  assert.deepEqual(plan.designs[0].errors, []);
});

test("the template produces a clean plan with no photos or hex needed", () => {
  const plan = buildBulkPlan(BULK_TEMPLATE_CSV, PLACEHOLDER);
  assert.deepEqual(plan.fileErrors, []);
  assert.deepEqual(plan.designs[0].errors, []);
  assert.equal(plan.designs[0].payload.colorVariants.length, 2);
});

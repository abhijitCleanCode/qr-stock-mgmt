import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import { BULK_COLUMNS, buildBulkPlan } from "./bulkDesignImport.js";
import { readImportFileAsCsv } from "./readImportFile.js";

const PLACEHOLDER = { name: "photo-pending.png" };

const workbookFile = (rows, name = "designs.xlsx") => {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Designs");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return { name, arrayBuffer: async () => bytes };
};

const ROW = ["kp100", "Anarkali", "Tunic", "Cotton", "Ramesh Tailors", 850, "", "Red", "", "S;M;L", "Top:S;M"];

test("an Excel workbook is read into rows the importer accepts", async () => {
  const file = workbookFile([BULK_COLUMNS, ROW, ["kp100", "Anarkali", "Tunic", "Cotton", "Ramesh Tailors", 850, "", "Blue", "", "S;M;L", "Top:S;M"]]);
  const text = await readImportFileAsCsv(file);
  const plan = buildBulkPlan(text, PLACEHOLDER);
  assert.deepEqual(plan.fileErrors, []);
  assert.deepEqual(plan.designs[0].errors, []);
  assert.deepEqual(plan.designs[0].payload.colorVariants.map((v) => v.colorName), ["Red", "Blue"]);
  assert.equal(plan.designs[0].payload.defaultSellingPricePerPiece, 850);
});

test("only the first sheet of a workbook is read", async () => {
  const sheet = XLSX.utils.aoa_to_sheet([BULK_COLUMNS, ROW]);
  const other = XLSX.utils.aoa_to_sheet([["not", "designs"]]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Designs");
  XLSX.utils.book_append_sheet(book, other, "Notes");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" });
  const text = await readImportFileAsCsv({ name: "two-sheets.xlsx", arrayBuffer: async () => bytes });
  assert.ok(text.startsWith("design_code,"));
  assert.ok(!text.includes("not,designs"));
});

test("a CSV file is read as text, unchanged", async () => {
  const file = { name: "designs.csv", text: async () => "a,b\n1,2\n" };
  assert.equal(await readImportFileAsCsv(file), "a,b\n1,2\n");
});

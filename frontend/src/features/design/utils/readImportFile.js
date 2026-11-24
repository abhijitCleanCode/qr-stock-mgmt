import * as XLSX from "xlsx";

// Accepted file types for the bulk import: Excel workbooks (.xlsx, .xls) and CSV.
export const IMPORT_FILE_ACCEPT = ".xlsx,.xls,.csv";

// Returns the file's rows as CSV text, so the same parser and rules handle every format.
// For Excel only the first sheet is read. Cell values come out as Excel displays them.
export async function readImportFileAsCsv(file) {
  if (/\.csv$/i.test(file.name)) return file.text();

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return "";
  return XLSX.utils.sheet_to_csv(firstSheet, { blankrows: false });
}

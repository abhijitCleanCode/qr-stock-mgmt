import { LETTERS_PATTERN, NAME_MAX_LENGTH } from "./nameRules.js";

// Design Master bulk import: reads one CSV (one row per colour variant) and turns it into the
// same payload the single-design register form sends. Every variant gets the shared placeholder
// photo; the real photos are added later from the design's edit screen. Pure functions only —
// no React, no network — so the rules can be tested on their own.

// Kept equal to BULK_IMPORT_MAX_DESIGNS in backend design.validator.js.
export const BULK_MAX_DESIGNS = 100;
const CODE_MAX_LENGTH = 30;
const NOTES_MAX_LENGTH = 300;

// Used when a colour name isn't in the list below and no hex was typed. Shown as a neutral grey
// so it's obvious the colour still needs its real value.
export const FALLBACK_COLOR_HEX = "#9CA3AF";

const COLOR_HEX_BY_NAME = {
  black: "#111111",
  white: "#FFFFFF",
  "off white": "#F5F5F0",
  cream: "#F5F0E1",
  ivory: "#FFFFF0",
  beige: "#D7BFA0",
  grey: "#9E9E9E",
  gray: "#9E9E9E",
  charcoal: "#36454F",
  red: "#C0392B",
  maroon: "#800000",
  wine: "#722F37",
  pink: "#E91E63",
  peach: "#FFCBA4",
  orange: "#E67E22",
  rust: "#B7410E",
  mustard: "#D4A017",
  yellow: "#F1C40F",
  olive: "#6B8E23",
  green: "#2E7D32",
  mint: "#98D8C8",
  teal: "#00897B",
  blue: "#1F3A93",
  navy: "#1B2A4A",
  "sky blue": "#87CEEB",
  purple: "#6A1B9A",
  lavender: "#B57EDC",
  brown: "#6D4C41",
  gold: "#D4AF37",
};

// Hex for a colour name from the built-in list, or the fallback grey.
export const colorHexFor = (colorName) => COLOR_HEX_BY_NAME[collapse(colorName).toLowerCase()] ?? FALLBACK_COLOR_HEX;

export const BULK_COLUMNS = [
  "design_code",
  "pattern",
  "item_name",
  "quality",
  "jobber",
  "selling_price",
  "notes",
  "color_name",
  "color_hex",
  "sizes",
  "semi_sets",
];

const REQUIRED_COLUMNS = ["design_code", "pattern", "item_name", "quality", "selling_price", "color_name", "sizes"];

// Fields that describe the design as a whole, so every row of one design must repeat the same value.
const DESIGN_FIELDS = {
  pattern: "Pattern",
  item_name: "Item name",
  quality: "Quality",
  jobber: "Jobber",
  selling_price: "Selling price",
  notes: "Notes",
  sizes: "Sizes",
  semi_sets: "Semi sets",
};

export const BULK_TEMPLATE_CSV = [
  BULK_COLUMNS.join(","),
  "kp100,Anarkali,Tunic,Cotton,Ramesh Tailors,850,,Red,,S;M;L;XL,Top:S;M|Bottom:L;XL",
  "kp100,Anarkali,Tunic,Cotton,Ramesh Tailors,850,,Blue,,S;M;L;XL,Top:S;M|Bottom:L;XL",
].join("\r\n") + "\r\n";

// RFC 4180-style parser: quoted fields may hold commas, line breaks and doubled quotes.
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = [];
  let cells = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i += 1;
      cells.push(field);
      records.push(cells);
      cells = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || cells.length > 0) {
    cells.push(field);
    records.push(cells);
  }
  return records;
}

// Header names are matched loosely: "Design Code", "design-code" and "design_code" all mean the same.
const normalizeHeader = (header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_");

// Reads the CSV into objects keyed by column name. `line` is the line number in the file, for messages.
export function readBulkRows(text) {
  const numbered = parseCsv(text)
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""));

  if (numbered.length === 0) return { headers: [], rows: [] };

  const headers = numbered[0].cells.map(normalizeHeader);
  const rows = numbered.slice(1).map(({ cells, line }) => {
    const row = { line };
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

const collapse = (value) => value.trim().replace(/\s+/g, " ");

// "S;M;L" -> ["S", "M", "L"]
export const parseSizes = (value) => value.split(";").map((size) => collapse(size)).filter(Boolean);

// "Top:S;M|Bottom:L;XL" -> [{ label: "Top", sizeLabels: ["S", "M"] }, ...]
// Returns { semiSets, errors } — a part without "name:sizes" is reported, not guessed at.
export function parseSemiSets(value) {
  const semiSets = [];
  const errors = [];
  if (!value) return { semiSets, errors };

  for (const part of value.split("|").map((item) => item.trim()).filter(Boolean)) {
    const colon = part.indexOf(":");
    const label = colon === -1 ? "" : collapse(part.slice(0, colon));
    const sizeLabels = colon === -1 ? [] : parseSizes(part.slice(colon + 1));
    if (!label || sizeLabels.length === 0) {
      errors.push(`Semi set "${part}" needs a name and sizes, like Top:S;M.`);
    } else {
      semiSets.push({ label, sizeLabels });
    }
  }
  return { semiSets, errors };
}

const CODE_PATTERN = /^[a-z0-9]+(?: [a-z0-9]+)*$/;

function checkCode(code) {
  const normalized = collapse(code).toLowerCase();
  if (!CODE_PATTERN.test(normalized)) return "Design code can contain only letters and numbers.";
  if (!/[a-z]/.test(normalized) || !/[0-9]/.test(normalized)) return "Design code must contain both letters and numbers (e.g. kp100).";
  if (normalized.replace(/ /g, "").length > CODE_MAX_LENGTH) return `Design code must be at most ${CODE_MAX_LENGTH} characters.`;
  return null;
}

function checkName(label, value, { required }) {
  if (!value) return required ? `${label} is required.` : null;
  if (collapse(value).length > NAME_MAX_LENGTH) return `${label} must be at most ${NAME_MAX_LENGTH} characters.`;
  if (!LETTERS_PATTERN.test(collapse(value))) return `${label} can contain letters only (spaces and hyphens between words are allowed).`;
  return null;
}

// Checks one design (all of its rows) and, if it is clean, builds the register payload.
// Every variant gets the same placeholder photo, so the photo itself is never a row error.
function buildDesign(code, rows, placeholder) {
  const errors = [];
  const first = rows[0];

  const codeError = checkCode(code);
  if (codeError) errors.push(`${codeError} (${code})`);

  for (const [field, label] of Object.entries(DESIGN_FIELDS)) {
    const expected = first[field];
    for (const row of rows.slice(1)) {
      if (row[field] !== expected) {
        errors.push(`Row ${row.line}: ${label} should be the same on every row of this design.`);
        break;
      }
    }
  }

  const nameErrors = [
    checkName("Pattern", first.pattern, { required: true }),
    checkName("Item name", first.item_name, { required: true }),
    checkName("Quality", first.quality, { required: true }),
    checkName("Jobber", first.jobber, { required: false }),
  ];
  errors.push(...nameErrors.filter(Boolean));

  const price = first.selling_price;
  if (!/^\d+$/.test(price)) errors.push("Selling price must be a whole number, e.g. 850.");
  if (first.notes.length > NOTES_MAX_LENGTH) errors.push(`Notes must be at most ${NOTES_MAX_LENGTH} characters.`);

  const sizes = parseSizes(first.sizes);
  if (sizes.length === 0) errors.push("Sizes are required, separated by semicolons, e.g. S;M;L.");
  if (new Set(sizes).size !== sizes.length) errors.push("Sizes must not repeat.");

  const { semiSets, errors: semiErrors } = parseSemiSets(first.semi_sets);
  errors.push(...semiErrors);
  for (const semi of semiSets) {
    const unknown = semi.sizeLabels.filter((size) => !sizes.includes(size));
    if (unknown.length > 0) errors.push(`Semi set "${semi.label}" uses sizes not in the design: ${unknown.join(", ")}.`);
  }

  const colors = new Set();
  const colorVariants = [];
  for (const row of rows) {
    if (!row.color_name) errors.push(`Row ${row.line}: colour name is required.`);
    const colorKey = collapse(row.color_name).toLowerCase();
    if (colorKey && colors.has(colorKey)) errors.push(`Row ${row.line}: colour "${row.color_name}" appears twice for this design.`);
    colors.add(colorKey);

    // Hex is optional: when blank it comes from the colour name, or the grey fallback.
    const hex = row.color_hex || colorHexFor(row.color_name);
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) errors.push(`Row ${row.line}: colour hex must look like #C0392B.`);

    colorVariants.push({ colorName: collapse(row.color_name), colorHex: hex });
  }

  const design = { code: collapse(code), rowCount: rows.length, errors, payload: null };
  if (errors.length === 0) {
    design.payload = {
      code: design.code,
      name: collapse(first.pattern),
      itemName: collapse(first.item_name),
      quality: collapse(first.quality),
      jobberName: first.jobber ? collapse(first.jobber) : undefined,
      defaultSellingPricePerPiece: Number(price),
      notes: first.notes || undefined,
      colorVariants,
      designSizes: sizes.map((sizeLabel, index) => ({ sizeLabel, displayOrder: index })),
      semiSets: semiSets.map((semi, index) => ({ label: semi.label, displayOrder: index, sizeLabels: semi.sizeLabels })),
      images: rows.map(() => placeholder),
    };
  }
  return design;
}

// Turns the CSV text into a plan: designs in file order, each with its errors (or its payload
// when clean), plus file-level problems. `placeholder` is the one photo every variant starts with.
export function buildBulkPlan(text, placeholder) {
  const { headers, rows } = readBulkRows(text);
  const fileErrors = [];

  if (headers.length === 0) {
    fileErrors.push("The file is empty.");
    return { designs: [], fileErrors };
  }
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    fileErrors.push(`The file is missing these columns: ${missing.join(", ")}.`);
    return { designs: [], fileErrors };
  }

  const groups = new Map();
  for (const row of rows) {
    if (!row.design_code) {
      fileErrors.push(`Row ${row.line}: design code is missing.`);
      continue;
    }
    const key = collapse(row.design_code).toLowerCase();
    if (!groups.has(key)) groups.set(key, { code: row.design_code, rows: [] });
    groups.get(key).rows.push(row);
  }

  const designs = [...groups.values()].map((group) => buildDesign(group.code, group.rows, placeholder));

  if (designs.length > BULK_MAX_DESIGNS) {
    fileErrors.push(`This file has ${designs.length} designs. Import at most ${BULK_MAX_DESIGNS} at a time — split the file and import it in parts.`);
  }

  return { designs, fileErrors };
}

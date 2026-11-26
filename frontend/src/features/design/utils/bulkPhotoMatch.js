// Matches photo file names to colour variants for the bulk photo upload.
//
// A photo is named "<design code>-<colour>.<ext>" (spaces allowed). Matching ignores case and every
// character that isn't a letter or digit, so "KP 557-Yellow", "kp557_yellow" and "KP557 YELLOW" are
// the same name. Names that don't match exactly may match a variant that is only a typo or two away.
// Those are only suggestions: the upload screen asks the user to confirm each one.

export const IMAGE_FILE = /\.(jpe?g|png|webp)$/i;

export const normalizeKey = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const variantKey = (designCode, colorName) => normalizeKey(`${designCode} ${colorName}`);

// Plain Levenshtein distance (insert, delete, substitute each cost 1).
export function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

// Short names allow one typo, longer names two. A 4-character name never matches loosely.
export const maxTypos = (key) => (key.length <= 4 ? 0 : key.length <= 8 ? 1 : 2);

const stripExtension = (fileName) => fileName.replace(/\.[^.]+$/, "");

/**
 * variants: [{ colorVariantId, designCode, colorName, hasPhoto }]
 * fileNames: ["KP 557-Yellow.jpg", ...]
 *
 * Returns:
 *  - matched:    exact matches, ready to upload          [{ fileName, variant }]
 *  - suggested:  close matches the user must confirm     [{ fileName, variant, typos }]
 *  - ambiguous:  a name that fits more than one variant  [{ fileName, variants }]
 *  - unmatched:  names with no variant                   [fileName]
 *  - skipped:    files that aren't JPG, PNG or WEBP       [fileName]
 *  - duplicates: a second photo for a variant already taken  [{ fileName, variant }]
 *  - withoutPhoto: variants that still have no photo after this batch  [variant]
 */
export function matchPhotos(fileNames, variants) {
  const byKey = new Map();
  for (const variant of variants) {
    const key = variantKey(variant.designCode, variant.colorName);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(variant);
  }

  const result = { matched: [], suggested: [], ambiguous: [], unmatched: [], skipped: [], duplicates: [], withoutPhoto: [] };
  const taken = new Set();

  const assign = (fileName, variant, kind, extra = {}) => {
    if (taken.has(variant.colorVariantId)) {
      result.duplicates.push({ fileName, variant });
      return;
    }
    taken.add(variant.colorVariantId);
    result[kind].push({ fileName, variant, ...extra });
  };

  for (const fileName of fileNames) {
    if (!IMAGE_FILE.test(fileName)) {
      result.skipped.push(fileName);
      continue;
    }
    const key = normalizeKey(stripExtension(fileName));

    const exact = byKey.get(key) ?? [];
    if (exact.length === 1) {
      assign(fileName, exact[0], "matched");
      continue;
    }
    if (exact.length > 1) {
      result.ambiguous.push({ fileName, variants: exact });
      continue;
    }

    const limit = maxTypos(key);
    if (limit === 0) {
      result.unmatched.push(fileName);
      continue;
    }
    const scored = variants
      .map((variant) => ({ variant, typos: editDistance(key, variantKey(variant.designCode, variant.colorName)) }))
      .filter((item) => item.typos <= limit)
      .sort((a, b) => a.typos - b.typos);

    if (scored.length === 0) {
      result.unmatched.push(fileName);
    } else if (scored.length > 1 && scored[0].typos === scored[1].typos) {
      result.ambiguous.push({ fileName, variants: scored.filter((item) => item.typos === scored[0].typos).map((item) => item.variant) });
    } else {
      assign(fileName, scored[0].variant, "suggested", { typos: scored[0].typos });
    }
  }

  result.withoutPhoto = variants.filter((variant) => !variant.hasPhoto && !taken.has(variant.colorVariantId));
  return result;
}

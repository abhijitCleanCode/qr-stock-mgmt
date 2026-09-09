import { useCallback, useState } from "react";
import { getVariantKey } from "../utils/variantKey";

// unitPrice is captured once at selection time from the design's default selling price
// (the same value shown in the design search dropdown) — not user-editable here. The order
// form (not yet built) is where actual sale price gets negotiated/overridden.
const createDefaultConfig = ({ designId, colorVariantId, sellingPricePerPiece }) => ({
  designId,
  colorVariantId,
  totalSetsSold: 0,
  loosePieces: {},
  unitPrice: sellingPricePerPiece ?? 0,
});

// Maps each selected variant (by its UI-only key) to its own, independent stock-out draft —
// same shape/isolation contract as useVariantStockConfigs, but loosePieces here keys straight
// off designSizeId (a record, not a localId list) since Stock Out only ever sells from a
// fixed, already-known set of existing sizes, never a freely-composed new one.
export function useVariantStockOutConfigs() {
  const [configs, setConfigs] = useState({});

  const ensureConfig = useCallback((variant) => {
    const key = getVariantKey(variant);
    setConfigs((prev) => (prev[key] ? prev : { ...prev, [key]: createDefaultConfig(variant) }));
  }, []);

  const removeConfig = useCallback((variantKey) => {
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[variantKey];
      return next;
    });
  }, []);

  const setTotalSetsSold = useCallback((variantKey, totalSetsSold) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: { ...prev[variantKey], totalSetsSold },
    }));
  }, []);

  const setLoosePieceQuantity = useCallback((variantKey, designSizeId, quantity) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: {
        ...prev[variantKey],
        loosePieces: { ...prev[variantKey].loosePieces, [designSizeId]: quantity },
      },
    }));
  }, []);

  const reset = useCallback(() => setConfigs({}), []);

  return {
    configs,
    ensureConfig,
    removeConfig,
    setTotalSetsSold,
    setLoosePieceQuantity,
    reset,
  };
}

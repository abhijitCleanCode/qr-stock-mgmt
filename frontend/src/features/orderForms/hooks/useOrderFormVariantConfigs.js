import { useCallback, useState } from "react";
import { getVariantKey } from "@/features/inventory/utils/variantKey";

// unitPrice is seeded from the design's default selling price (same value shown in the
// design search dropdown) but stays editable here — unlike Stock In/Out, an order form's
// whole purpose is proposing a price to a retailer, so it has to be adjustable per line.
// Quantity is always entered manually per size, in pieces — priced per piece, never per set.
const createDefaultConfig = ({ designId, colorVariantId, sellingPricePerPiece }) => ({
  designId,
  colorVariantId,
  loosePieces: {},
  looseUnitPrice: sellingPricePerPiece ?? 0,
});

export function useOrderFormVariantConfigs(initialConfigs = {}) {
  const [configs, setConfigs] = useState(initialConfigs);

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

  const setLoosePieces = useCallback((variantKey, loosePieces) => {
    setConfigs((prev) => ({ ...prev, [variantKey]: { ...prev[variantKey], loosePieces } }));
  }, []);

  const setLooseUnitPrice = useCallback((variantKey, looseUnitPrice) => {
    setConfigs((prev) => ({ ...prev, [variantKey]: { ...prev[variantKey], looseUnitPrice } }));
  }, []);

  const reset = useCallback(() => setConfigs({}), []);

  return {
    configs,
    ensureConfig,
    removeConfig,
    setLoosePieces,
    setLooseUnitPrice,
    reset,
  };
}

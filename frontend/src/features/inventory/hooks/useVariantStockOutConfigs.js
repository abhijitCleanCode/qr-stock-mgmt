import { useCallback, useState } from "react";
import { getVariantKey } from "../utils/variantKey";
import { createLocalId } from "../utils/localId";

// unitPrice is captured once at selection time from the design's default selling price
// (the same value shown in the design search dropdown) — not user-editable here. The order
// form (not yet built) is where actual sale price gets negotiated/overridden.
const createDefaultConfig = ({ designId, colorVariantId, sellingPricePerPiece }) => ({
  designId,
  colorVariantId,
  totalSetsSold: 0,
  bundles: [],
  loosePieces: {},
  unitPrice: sellingPricePerPiece ?? 0,
});

// Maps each selected variant (by its UI-only key) to its own, independent stock-out draft —
// same shape/isolation contract as useVariantStockConfigs, including bundles as a list of
// individually add/edit/removable entries (each { localId, stockGroupId, quantity,
// composition }), same as Stock In's bundles — just sourced from an existing stock_group
// instead of a freely-typed composition.
export function useVariantStockOutConfigs() {
  const [configs, setConfigs] = useState({});

  const ensureConfig = useCallback((variant) => {
    const key = getVariantKey(variant);
    setConfigs((prev) => (prev[key] ? prev : { ...prev, [key]: createDefaultConfig(variant) }));
  }, []);

  const setTotalSetsSold = useCallback((variantKey, totalSetsSold) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: { ...prev[variantKey], totalSetsSold },
    }));
  }, []);

  const addBundle = useCallback((variantKey, { stockGroupId, quantity, composition }) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: {
        ...prev[variantKey],
        bundles: [
          ...prev[variantKey].bundles,
          { localId: createLocalId(), stockGroupId, quantity, composition },
        ],
      },
    }));
  }, []);

  const updateBundle = useCallback((variantKey, localId, { stockGroupId, quantity, composition }) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: {
        ...prev[variantKey],
        bundles: prev[variantKey].bundles.map((bundle) =>
          bundle.localId === localId ? { ...bundle, stockGroupId, quantity, composition } : bundle
        ),
      },
    }));
  }, []);

  const removeBundle = useCallback((variantKey, localId) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: {
        ...prev[variantKey],
        bundles: prev[variantKey].bundles.filter((bundle) => bundle.localId !== localId),
      },
    }));
  }, []);

  const setLoosePieces = useCallback((variantKey, loosePieces) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: { ...prev[variantKey], loosePieces },
    }));
  }, []);

  const reset = useCallback(() => setConfigs({}), []);

  return {
    configs,
    ensureConfig,
    setTotalSetsSold,
    addBundle,
    updateBundle,
    removeBundle,
    setLoosePieces,
    reset,
  };
}

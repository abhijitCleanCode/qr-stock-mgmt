import { useCallback, useState } from "react";
import { getVariantKey } from "../utils/variantKey";

const createDefaultConfig = ({ designId, colorVariantId }) => ({
  designId,
  colorVariantId,
  totalSetsReceived: 0,
  bundles: [],
  loosePieces: {},
});

// Maps each selected variant (by its UI-only key) to its own, independent stock-entry
// draft, so switching the active variant never touches another variant's state.
export function useVariantStockConfigs() {
  const [configs, setConfigs] = useState({});

  const ensureConfig = useCallback((variant) => {
    const key = getVariantKey(variant);
    setConfigs((prev) => (prev[key] ? prev : { ...prev, [key]: createDefaultConfig(variant) }));
  }, []);

  const updateConfig = useCallback((variantKey, updater) => {
    setConfigs((prev) => ({
      ...prev,
      [variantKey]: typeof updater === "function" ? updater(prev[variantKey]) : { ...prev[variantKey], ...updater },
    }));
  }, []);

  return { configs, ensureConfig, updateConfig };
}

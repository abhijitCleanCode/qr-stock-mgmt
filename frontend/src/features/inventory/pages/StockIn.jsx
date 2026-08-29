import { useState } from "react";
import DesignSearchInput from "../components/DesignSearchInput";
import VariantStockCard from "../components/VariantStockCard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { getVariantKey } from "../utils/variantKey";

const StockIn = () => {
  const [selectedVariants, setSelectedVariants] = useState([]);
  // Accordion behavior: at most one card expanded at a time, so registering a variant
  // and moving to the next one never requires scrolling past everyone else's config.
  const [expandedVariantKey, setExpandedVariantKey] = useState(null);
  const {
    configs,
    ensureConfig,
    setTotalSetsReceived,
    addBundle,
    updateBundle,
    removeBundle,
    setLoosePieces,
  } = useVariantStockConfigs();

  const handleSelect = (variant) => {
    const key = getVariantKey(variant);

    setSelectedVariants((prev) =>
      prev.some((item) => getVariantKey(item) === key) ? prev : [...prev, variant]
    );
    ensureConfig(variant);
    // Newly picked variant opens for entry immediately — no separate "make active" step.
    setExpandedVariantKey(key);
  };

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Stock In</h1>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium" htmlFor="design-search">Design</label>
        <DesignSearchInput id="design-search" onSelect={handleSelect} />
      </div>

      {selectedVariants.length > 0 && (
        <div className="flex flex-col gap-3">
          {selectedVariants.map((variant) => {
            const key = getVariantKey(variant);
            const config = configs[key];
            if (!config) return null;

            return (
              <VariantStockCard
                key={key}
                variant={variant}
                config={config}
                isExpanded={key === expandedVariantKey}
                onToggle={(open) => setExpandedVariantKey(open ? key : null)}
                onSetTotalSetsReceived={(value) => setTotalSetsReceived(key, value)}
                onAddBundle={(bundle) => addBundle(key, bundle)}
                onUpdateBundle={(localId, bundle) => updateBundle(key, localId, bundle)}
                onRemoveBundle={(localId) => removeBundle(key, localId)}
                onSetLoosePieces={(loosePieces) => setLoosePieces(key, loosePieces)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockIn;

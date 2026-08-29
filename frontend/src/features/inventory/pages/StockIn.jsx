import { useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import DesignSearchInput from "../components/DesignSearchInput";
import VariantStockCard from "../components/VariantStockCard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { useStockInRegisterApi } from "../hooks/useStockInRegisterApi";
import { buildStockInPayload } from "../utils/buildStockInPayload";
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
    reset: resetConfigs,
  } = useVariantStockConfigs();

  const { mutateAsync: registerStockIn, isPending } = useStockInRegisterApi();

  const handleSelect = (variant) => {
    const key = getVariantKey(variant);

    setSelectedVariants((prev) =>
      prev.some((item) => getVariantKey(item) === key) ? prev : [...prev, variant]
    );
    ensureConfig(variant);
    // Newly picked variant opens for entry immediately — no separate "make active" step.
    setExpandedVariantKey(key);
  };

  const handleRegisterStockIn = async () => {
    const payload = buildStockInPayload(selectedVariants, configs);

    if (payload.designs.length === 0) {
      toast.error("Enter stock for at least one variant before registering.");
      return;
    }

    try {
      await registerStockIn(payload);
      toast.success("Stock registered successfully.");
      setSelectedVariants([]);
      setExpandedVariantKey(null);
      resetConfigs();
    } catch (error) {
      toast.error(error?.message ?? "Couldn't register stock. Please try again.");
    }
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

      {selectedVariants.length > 0 && (
        <Button
          type="button"
          className="h-11 w-full bg-[#00694C] sm:w-auto sm:self-end"
          onClick={handleRegisterStockIn}
          disabled={isPending}
        >
          {isPending ? "Registering..." : "Register Stock In"}
        </Button>
      )}
    </div>
  );
};

export default StockIn;

import { useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import DesignSearchInput from "../components/DesignSearchInput";
import VariantStockOutCard from "../components/VariantStockOutCard";
import { useVariantStockOutConfigs } from "../hooks/useVariantStockOutConfigs";
import { useStockOutRegisterApi } from "../hooks/useStockOutRegisterApi";
import { buildStockOutPayload } from "../utils/buildStockOutPayload";
import { getVariantKey } from "../utils/variantKey";

const StockOut = () => {
  const [selectedVariants, setSelectedVariants] = useState([]);
  // Accordion behavior: at most one card expanded at a time — same as Stock In.
  const [expandedVariantKey, setExpandedVariantKey] = useState(null);
  const {
    configs,
    ensureConfig,
    setTotalSetsSold,
    addBundle,
    updateBundle,
    removeBundle,
    setLoosePieces,
    reset: resetConfigs,
  } = useVariantStockOutConfigs();

  const { mutateAsync: registerStockOut, isPending } = useStockOutRegisterApi();

  const handleSelect = (variant) => {
    const key = getVariantKey(variant);

    setSelectedVariants((prev) =>
      prev.some((item) => getVariantKey(item) === key) ? prev : [...prev, variant]
    );
    ensureConfig(variant);
    setExpandedVariantKey(key);
  };

  const handleRegisterStockOut = async () => {
    const payload = buildStockOutPayload(selectedVariants, configs);

    if (payload.designs.length === 0) {
      toast.error("Enter quantity sold for at least one variant before registering.");
      return;
    }

    try {
      await registerStockOut(payload);
      toast.success("Stock out registered successfully.");
      setSelectedVariants([]);
      setExpandedVariantKey(null);
      resetConfigs();
    } catch (error) {
      toast.error(error?.message ?? "Couldn't register stock out. Please try again.");
    }
  };

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Stock Out</h1>
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
              <VariantStockOutCard
                key={key}
                variant={variant}
                config={config}
                isExpanded={key === expandedVariantKey}
                onToggle={(open) => setExpandedVariantKey(open ? key : null)}
                onSetTotalSetsSold={(value) => setTotalSetsSold(key, value)}
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
          className="h-11 w-full bg-[#B91C1C] sm:w-auto sm:self-end"
          onClick={handleRegisterStockOut}
          disabled={isPending}
        >
          {isPending ? "Registering..." : "Register Stock Out"}
        </Button>
      )}
    </div>
  );
};

export default StockOut;

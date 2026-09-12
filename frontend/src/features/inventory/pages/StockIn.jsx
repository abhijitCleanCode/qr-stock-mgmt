import { useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DesignSearchInput from "../components/DesignSearchInput";
import VariantStockCard from "../components/VariantStockCard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { useStockInRegisterApi } from "../hooks/useStockInRegisterApi";
import { buildStockInPayload } from "../utils/buildStockInPayload";
import { getVariantKey } from "../utils/variantKey";

// "YYYY-MM-DD" in the user's own local calendar day — never via `new Date().toISOString()`,
// which reads UTC and can report yesterday's/tomorrow's date depending on the local offset.
function todayAsIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const StockIn = () => {
  const [selectedVariants, setSelectedVariants] = useState([]);
  // Accordion behavior: at most one card expanded at a time, so registering a variant
  // and moving to the next one never requires scrolling past everyone else's config.
  const [expandedVariantKey, setExpandedVariantKey] = useState(null);
  // One Delivery Date + Challan No. per registration submission, applied to every design/variant
  // in it — same convention the backend already uses for stockDate (see stockIn.validator.js).
  const [deliveryDate, setDeliveryDate] = useState(todayAsIsoDate);
  const [challanNo, setChallanNo] = useState("");
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
    if (!deliveryDate) {
      toast.error("Delivery Date is required.");
      return;
    }

    if (!challanNo.trim()) {
      toast.error("Challan No. is required.");
      return;
    }

    const payload = buildStockInPayload(selectedVariants, configs, { deliveryDate, challanNo });

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
      setChallanNo("");
      setDeliveryDate(todayAsIsoDate());
    } catch (error) {
      toast.error(error?.message ?? "Couldn't register stock. Please try again.");
    }
  };

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Stock In</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2.5">
          <label className="text-sm font-medium" htmlFor="delivery-date">Date of Delivery</label>
          <Input
            id="delivery-date"
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          <label className="text-sm font-medium" htmlFor="challan-no">Challan No.</label>
          <Input
            id="challan-no"
            type="text"
            placeholder="Enter challan number..."
            value={challanNo}
            onChange={(event) => setChallanNo(event.target.value)}
          />
        </div>
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

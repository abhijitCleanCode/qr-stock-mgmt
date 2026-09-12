import { Loader2Icon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useColorVariantSizesApi } from "@/features/inventory/hooks/useColorVariantSizesApi";
import LoosePiecesSummary from "@/features/inventory/components/LoosePiecesSummary";
import { getLoosePiecesTotal } from "@/features/inventory/utils/stockCalculations";

const formatInr = (amount) => `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const parseNonNegativeNumber = (rawValue) => {
  if (rawValue === "") return 0;
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

// No stock bounds here at all (unlike Stock Out) — an order form is a pre-sale quote, so
// quantities are whatever the wholesaler is proposing, and price is directly editable per
// line since negotiating that price with the retailer is the entire point of this form.
// Quantity is always entered manually per size, in pieces — never as an auto-multiplied set
// count — so price is calculated per piece throughout.
const OrderFormVariantConfigPanel = ({
  variant,
  config,
  onSetLoosePieces,
  onSetLooseUnitPrice,
}) => {
  const { data: sizesResponse, isFetching } = useColorVariantSizesApi({ colorVariantId: variant.colorVariantId });
  const sizes = sizesResponse?.data ?? [];

  const looseTotal = getLoosePiecesTotal(config.loosePieces);

  return (
    <div className="flex flex-col gap-4 border-t border-border p-3 sm:p-4">
      {isFetching && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Loading active sizes...
        </p>
      )}

      <div className="flex flex-col gap-2">
        <LoosePiecesSummary
          loosePieces={config.loosePieces}
          sizes={sizes}
          disabled={sizes.length === 0}
          onChange={onSetLoosePieces}
        />
        {looseTotal > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Unit price (₹ / piece)</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={config.looseUnitPrice}
                onChange={(event) => onSetLooseUnitPrice(parseNonNegativeNumber(event.target.value))}
                className="h-9 w-24 text-center text-base"
              />
              <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                {formatInr(looseTotal * config.looseUnitPrice)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderFormVariantConfigPanel;

import { Loader2Icon } from "lucide-react";

import { useCurrentStockDetailApi } from "../hooks/useCurrentStockDetailApi";
import QuantityStepper from "./QuantityStepper";

const formatInr = (amount) => `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

// One sellable line: a label ("Sets (8 avl)" / "Size S (4 avl)"), a bounded −/+ stepper, and
// the live-computed price for that line (quantity × unitPrice) — same row shape the reference
// design uses for every sellable unit.
const StockOutLine = ({ id, label, value, max, unitPrice, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex items-center gap-4">
      <QuantityStepper id={id} value={value} onChange={onChange} min={0} max={max} />
      <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground">
        {formatInr(value * unitPrice)}
      </span>
    </div>
  </div>
);

// Bundles are dropped from Stock Out for now — only complete SETs and LOOSE_PIECEs are sold
// here, both bounded by what's actually in stock right now (via the Current Stock Detail API),
// never a freely-composed quantity.
const VariantStockOutConfigPanel = ({
  variant,
  config,
  onSetTotalSetsSold,
  onSetLoosePieceQuantity,
}) => {
  const { colorVariantId } = variant;

  const { data: response, isFetching, isError } = useCurrentStockDetailApi(colorVariantId);
  const detail = response?.data;

  const availableSets = detail?.availableSets ?? 0;
  const sizesWithLoosePieces = (detail?.sizes ?? []).filter((size) => size.loosePieces > 0);

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3 sm:p-4">
      {isFetching && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Loading available stock...
        </p>
      )}

      {!isFetching && isError && (
        <p className="text-xs text-destructive">Failed to load available stock for this variant.</p>
      )}

      {!isFetching && !isError && (
        <>
          {availableSets > 0 && (
            <StockOutLine
              id="total-sets-sold"
              label={`Sets (${availableSets} avl)`}
              value={config.totalSetsSold}
              max={availableSets}
              unitPrice={config.unitPrice}
              onChange={onSetTotalSetsSold}
            />
          )}

          {sizesWithLoosePieces.map((size) => (
            <StockOutLine
              key={size.designSizeId}
              id={`loose-${size.designSizeId}`}
              label={`Size ${size.size} (${size.loosePieces} avl)`}
              value={config.loosePieces[size.designSizeId] ?? 0}
              max={size.loosePieces}
              unitPrice={config.unitPrice}
              onChange={(quantity) => onSetLoosePieceQuantity(size.designSizeId, quantity)}
            />
          ))}

          {availableSets === 0 && sizesWithLoosePieces.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              No stock currently available to sell for this variant.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default VariantStockOutConfigPanel;

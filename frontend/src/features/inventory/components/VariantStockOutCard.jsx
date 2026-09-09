import { Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import SelectedVariantCard from "./SelectedVariantCard";
import VariantStockOutConfigPanel from "./VariantStockOutConfigPanel";

// One selected variant, always visible (no expand/collapse) — matches the reference design's
// flat list of ready-to-edit rows, rather than Stock In's accordion (a shopkeeper selling to
// several retailers in one sitting wants every line visible and editable at once, not one at
// a time).
const VariantStockOutCard = ({
  variant,
  config,
  onRemove,
  onSetTotalSetsSold,
  onSetLoosePieceQuantity,
}) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border glass-card">
      <div className="flex items-center gap-2 p-2.5">
        <SelectedVariantCard variant={variant} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove variant"
        >
          <Trash2Icon />
        </Button>
      </div>

      <VariantStockOutConfigPanel
        variant={variant}
        config={config}
        onSetTotalSetsSold={onSetTotalSetsSold}
        onSetLoosePieceQuantity={onSetLoosePieceQuantity}
      />
    </div>
  );
};

export default VariantStockOutCard;

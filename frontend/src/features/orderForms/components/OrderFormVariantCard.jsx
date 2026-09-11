import { ChevronDown, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import SelectedVariantCard from "@/features/inventory/components/SelectedVariantCard";
import OrderFormVariantConfigPanel from "./OrderFormVariantConfigPanel";

const OrderFormVariantCard = ({
  variant,
  config,
  isExpanded,
  onToggle,
  onRemove,
  onSetLoosePieces,
  onSetLooseUnitPrice,
}) => {
  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggle}
      className={cn(
        "overflow-hidden rounded-2xl border glass-card transition-colors",
        isExpanded ? "border-primary/50" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 p-2.5">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left" render={<button type="button" />}>
          <SelectedVariantCard variant={variant} />
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
        </CollapsibleTrigger>
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

      <CollapsibleContent>
        <OrderFormVariantConfigPanel
          variant={variant}
          config={config}
          onSetLoosePieces={onSetLoosePieces}
          onSetLooseUnitPrice={onSetLooseUnitPrice}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};

export default OrderFormVariantCard;

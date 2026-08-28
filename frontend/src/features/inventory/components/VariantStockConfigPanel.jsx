import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useColorVariantSizesApi } from "../hooks/useColorVariantSizesApi";

const VariantStockConfigPanel = ({ variant, config }) => {
  const { colorVariantId } = variant;

  const { data: response, isFetching, isError } = useColorVariantSizesApi({ colorVariantId });
  const sizes = response?.data ?? [];

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">
        {isFetching && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2Icon className="size-3.5 animate-spin" />
            Loading active sizes...
          </span>
        )}
        {!isFetching && isError && "Failed to load active sizes for this variant."}
        {!isFetching && !isError && (
          sizes.length > 0
            ? `Sizes: ${sizes.map((size) => size.sizeLabel).join(", ")}`
            : "No active sizes configured for this variant."
        )}
      </p>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:items-start">
        <CompleteSetsSection totalSetsReceived={config.totalSetsReceived} />
        <PartialBundlesSection bundleCount={config.bundles.length} />
        <LoosePiecesSection loosePieceSizeCount={Object.keys(config.loosePieces).length} />
      </div>
    </div>
  );
};

const SectionCard = ({ title, count, children }) => (
  <section className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/20 p-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count > 0 && <Badge variant="outline">{count}</Badge>}
    </div>
    {children}
  </section>
);

// Read-only for now — the value only reflects state already on the variant's config,
// wired up so the next step only has to add the onChange handler.
const CompleteSetsSection = ({ totalSetsReceived }) => (
  <SectionCard title="Complete Sets">
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground">Sets received</label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={totalSetsReceived}
        readOnly
        className="h-11 w-20 text-center text-base"
      />
    </div>
  </SectionCard>
);

const PartialBundlesSection = ({ bundleCount }) => {
  const [showEntry, setShowEntry] = useState(false);

  return (
    <SectionCard title="Partial Bundles" count={bundleCount}>
      {!showEntry ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setShowEntry(true)}
        >
          <PlusIcon className="size-4" />
          Add Bundle
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Bundles received</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              disabled
              placeholder="0"
              className="h-11 w-20 text-center text-base"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Pieces in each bundle</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end text-muted-foreground"
            onClick={() => setShowEntry(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </SectionCard>
  );
};

const LoosePiecesSection = ({ loosePieceSizeCount }) => {
  const [showEntry, setShowEntry] = useState(false);

  return (
    <SectionCard title="Loose Pieces" count={loosePieceSizeCount}>
      {!showEntry ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start gap-2 text-muted-foreground"
          onClick={() => setShowEntry(true)}
        >
          <PlusIcon className="size-4" />
          Add Loose Pieces
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <span className="text-sm text-muted-foreground">Size-by-size quantity entry coming soon.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end text-muted-foreground"
            onClick={() => setShowEntry(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </SectionCard>
  );
};

export default VariantStockConfigPanel;

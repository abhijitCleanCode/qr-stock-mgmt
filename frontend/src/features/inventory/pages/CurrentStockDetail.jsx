import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { Link, useParams } from "react-router";

import DataTable from "@/components/shared/table/DataTable";
import { Button } from "@/components/ui/button";
import { useCurrentStockDetailApi } from "../hooks/useCurrentStockDetailApi";
import { columns } from "../table/CurrentStockDetailColumns";
import BundleCompositionCard from "../components/BundleCompositionCard";

const MetricTile = ({ label, value, emphasize }) => (
  <div className="neu-button flex flex-col gap-1 rounded-xl px-4 py-3">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className={emphasize ? "text-2xl font-bold text-[#1E1B4B]" : "text-lg font-semibold text-foreground"}>
      {value}
    </span>
  </div>
);

const CurrentStockDetail = () => {
  const { colorVariantId } = useParams();

  const { data: response, isPending, isError, error, refetch } = useCurrentStockDetailApi(colorVariantId);
  const detail = response?.data;

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link to="/current-stock" className="inline-flex items-center gap-1.5">
            <ArrowLeftIcon className="size-4" />
            Current Stock
          </Link>
        </Button>

        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Current Stock Detail</h1>
      </div>

      {isPending && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-border py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading stock details...
        </p>
      )}

      {!isPending && isError && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "Unable to load stock details. Please try again."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isPending && !isError && detail && (
        <>
          {/* Design + variant identity — compact, not a hero card */}
          <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {detail.variant.imageUrl && (
                <img
                  src={detail.variant.imageUrl}
                  alt={detail.variant.colorName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-lg font-bold text-[#1E1B4B]">
                {detail.design.code ? `${detail.design.code} · ` : ""}
                {detail.design.name}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: detail.variant.colorHex }}
                />
                {detail.variant.colorName}
              </span>
            </div>
          </div>

          {/* Compact metrics — subtle neumorphic tiles, Total Pieces emphasized */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Total Pieces" value={detail.totals.totalPieces} emphasize />
            <MetricTile label="Set Pieces" value={detail.totals.setPieces} />
            <MetricTile label="Bundle Pieces" value={detail.totals.bundlePieces} />
            <MetricTile label="Loose Pieces" value={detail.totals.loosePieces} />
          </div>

          {/* Stock by Size + Bundle Compositions — side by side on desktop, stacked below */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <section className="flex min-w-0 flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Stock by Size</h2>

              <DataTable
                columns={columns}
                data={detail.sizes}
                emptyState={{
                  title: "No active sizes configured",
                  description: "This variant has no active sizes to show stock for.",
                }}
              />

              {detail.sizes.length > 0 && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-2.5 sm:px-6">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <div className="grid grid-cols-4 gap-3 text-right sm:gap-6">
                    {[
                      ["Set", detail.totals.setPieces],
                      ["Bundle", detail.totals.bundlePieces],
                      ["Loose", detail.totals.loosePieces],
                      ["Total", detail.totals.totalPieces],
                    ].map(([label, value]) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="flex min-w-0 flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Bundle Compositions</h2>

              {detail.compositions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No bundles currently in stock.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {detail.compositions.map((composition, index) => (
                    <BundleCompositionCard key={composition.stockGroupId} index={index} composition={composition} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentStockDetail;

import { ChevronRight, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aggregateSizes, formatInr, groupByDesign, sumBy } from "../../utils/currentStock";
import { AgeCell, ColorDot, Num, SizeChips, StatusPill } from "./primitives";

const DESIGN_COLS = "lg:grid-cols-[30px_1.6fr_1.9fr_1fr_.7fr_.6fr_.9fr]";
const VARIANT_COLS = "lg:grid-cols-[1.5fr_1.9fr_1fr_.7fr_.6fr_.9fr_72px]";
const HEAD = "text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400";

const EmptyState = () => (
  <div className="px-6 py-12 text-center text-sm text-slate-500">
    <b className="mb-1 block text-[15px] text-slate-900">Nothing matches</b>
    Try another search, or clear the filters.
  </div>
);

// Sets / semi sets / loose under the piece count, only the ones that have any.
const PieceBreakdown = ({ sets, semi, loose }) => {
  const parts = [sets && `${sets} sets`, semi && `${semi} semi`, loose && `${loose} loose`].filter(Boolean);
  return parts.length ? <div className="mt-0.5 font-sans text-[11px] text-slate-400">{parts.join(" · ")}</div> : null;
};

const VariantRow = ({ variant, onOpen }) => (
  <div className={cn("grid grid-cols-2 items-center gap-x-3 gap-y-2 border-t border-slate-100 bg-white px-4 py-2.5 text-[12.6px] hover:bg-slate-50/70", VARIANT_COLS)}>
    <div className="col-span-2 flex min-w-0 items-center gap-2.5 lg:col-span-1">
      <ColorDot hex={variant.colorHex} />
      <div className="min-w-0">
        <b className="block truncate font-semibold text-slate-900">{variant.colorName}</b>
        <div className="font-mono text-[11px] text-slate-400">{variant.design.code}</div>
      </div>
    </div>
    <div className="col-span-2 lg:col-span-1">
      <SizeChips sizes={variant.sizes} onSelect={() => onOpen(variant.colorVariantId)} />
    </div>
    <div className="lg:text-left">
      <Num className="font-bold text-slate-900">{variant.totalPieces}</Num>
      <PieceBreakdown sets={variant.sets} semi={variant.semiSets} loose={variant.loosePieces} />
    </div>
    <Num className="hidden lg:inline">{formatInr(variant.value)}</Num>
    <span className="hidden lg:inline">
      <AgeCell pieces={variant.totalPieces} days={variant.oldestDays} ageing={variant.isAgeing} />
    </span>
    <span>
      <StatusPill variant={variant} />
    </span>
    <div className="text-right">
      <Button type="button" variant="outline" size="sm" onClick={() => onOpen(variant.colorVariantId)} className="gap-1 text-xs">
        <Eye className="size-3.5" />
        View
      </Button>
    </div>
  </div>
);

// The most urgent status across a design's colours, for the design row's status pill.
const worstVariant = (variants) =>
  variants.find((variant) => variant.status === "OUT_OF_STOCK") ??
  variants.find((variant) => variant.status === "LOW") ??
  variants.find((variant) => variant.isAgeing) ??
  variants[0];

const DesignGroup = ({ group, isOpen, onToggle, onOpen }) => {
  const { design, variants } = group;
  const pieces = sumBy(variants, (variant) => variant.totalPieces);
  const needAttention = variants.filter((variant) => variant.status !== "IN_STOCK");
  const worstIsOut = needAttention.some((variant) => variant.status === "OUT_OF_STOCK");
  const oldestDays = Math.max(-1, ...variants.filter((variant) => variant.totalPieces).map((variant) => variant.oldestDays ?? 0));
  const ageing = variants.some((variant) => variant.isAgeing);

  return (
    <>
      <div className={cn("grid grid-cols-[30px_1fr] items-center gap-x-3 gap-y-2 border-t border-slate-200 bg-white px-4 py-3 text-[13px]", DESIGN_COLS)}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "Hide colours" : "Show colours"}
          aria-expanded={isOpen}
          className="grid size-[30px] place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex flex-none">
              {variants.slice(0, 3).map((variant, index) => (
                <span
                  key={variant.colorVariantId}
                  className={cn("size-3.5 rounded-full ring-2 ring-white", index > 0 && "-ml-1")}
                  style={{ backgroundColor: variant.colorHex || "#CBD5E1" }}
                />
              ))}
            </span>
            <span className="min-w-0 truncate">
              <b className="font-mono text-slate-900">{design.code}</b> <span className="text-slate-600">{design.name}</span>
            </span>
          </div>
          <div className="mt-0.5 pl-[42px] text-[11.6px] text-slate-400">
            {variants.length} colour{variants.length === 1 ? "" : "s"} · {formatInr(design.sellingPricePerPiece)}/pc
            {needAttention.length > 0 && (
              <>
                {" · "}
                <span className={cn("font-semibold", worstIsOut ? "text-red-600" : "text-amber-700")}>
                  {needAttention.length} need{needAttention.length === 1 ? "s" : ""} attention
                </span>
              </>
            )}
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <SizeChips sizes={aggregateSizes(variants)} onSelect={onToggle} />
        </div>
        <div>
          <Num className="font-bold text-slate-900">
            {pieces}
            <span className="lg:hidden"> pcs</span>
          </Num>
          <PieceBreakdown
            sets={sumBy(variants, (variant) => variant.sets)}
            semi={sumBy(variants, (variant) => variant.semiSets)}
            loose={sumBy(variants, (variant) => variant.loosePieces)}
          />
        </div>
        <Num className="hidden lg:inline">{formatInr(sumBy(variants, (variant) => variant.value))}</Num>
        <span className="hidden lg:inline">
          <AgeCell pieces={pieces} days={oldestDays} ageing={ageing} />
        </span>
        <span className="hidden lg:inline">
          <StatusPill variant={worstVariant(variants)} />
        </span>
      </div>

      {isOpen && (
        <div className="bg-slate-50/70 px-4 pb-3 pt-1 lg:pl-[58px]">
          <div className={cn("hidden gap-x-3 px-4 pb-1 pt-2 lg:grid", VARIANT_COLS, HEAD)}>
            <span>Colour</span>
            <span>Sizes</span>
            <span>Pieces</span>
            <span>Value</span>
            <span>Oldest</span>
            <span>Status</span>
            <span />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {variants.map((variant) => (
              <VariantRow key={variant.colorVariantId} variant={variant} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Design → colours table. A design is expanded when the user opened it, or automatically while
// any filter/search is narrowing the list (so matches are never hidden inside a collapsed row).
const StockTable = ({ variants, expanded, onToggle, forceOpen, onOpen }) => {
  const groups = groupByDesign(variants);

  return (
    <div className="overflow-hidden rounded-[13px] border border-slate-200">
      <div className={cn("hidden items-center gap-x-3 bg-slate-50 px-4 py-2.5 lg:grid", DESIGN_COLS, HEAD)}>
        <span />
        <span>Design</span>
        <span>Size availability (all colours)</span>
        <span>Pieces</span>
        <span>Value</span>
        <span>Oldest</span>
        <span>Status</span>
      </div>
      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((group) => (
          <DesignGroup
            key={group.design.id}
            group={group}
            isOpen={forceOpen || Boolean(expanded[group.design.id])}
            onToggle={() => onToggle(group.design.id)}
            onOpen={onOpen}
          />
        ))
      )}
    </div>
  );
};

export default StockTable;

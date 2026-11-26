import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Download, Loader2, Lock, Plus, Printer, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentStockOverviewApi, useStockAdjustmentsApi } from "../hooks/useCurrentStockOverviewApi";
import { resolveStockTagApi } from "../services/currentStockOverview.api";
import {
  downloadCurrentStockCsv,
  filterVariants,
  formatInr,
  formatNumber,
  groupByDesign,
  SORTS,
  STATUS_FILTERS,
  sumBy,
} from "../utils/currentStock";
import { Sheet } from "../components/current-stock/primitives";
import StockTable from "../components/current-stock/StockTable";
import SizeMatrix from "../components/current-stock/SizeMatrix";
import AdjustmentLog from "../components/current-stock/AdjustmentLog";
import VariantDrawer from "../components/current-stock/VariantDrawer";
import AddStockDialog from "../components/current-stock/AddStockDialog";
import ReverseDialog from "../components/current-stock/ReverseDialog";
import PrintReport from "../components/current-stock/PrintReport";

const DEFAULT_FILTERS = { query: "", status: "all", designId: "", sort: "attention" };

const SELECT =
  "cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-emerald-500";

const TABS = [
  ["stock", "Stock"],
  ["matrix", "Size matrix"],
  ["log", "Adjustment log"],
];

// Relative "Synced 12s ago" label, refreshed on a timer so the age keeps moving.
const SyncStatus = ({ updatedAt, busy }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  let label = "Syncing…";
  if (!busy && updatedAt) {
    const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
    if (seconds < 5) label = "Synced just now";
    else if (seconds < 60) label = `Synced ${seconds}s ago`;
    else label = `Synced ${Math.round(seconds / 60)} min ago`;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", busy ? "animate-pulse bg-amber-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
};

const CurrentStock = () => {
  const [tab, setTab] = useState("stock");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expanded, setExpanded] = useState({});
  const [drawerVariantId, setDrawerVariantId] = useState(null);
  const [addStockFor, setAddStockFor] = useState(undefined); // undefined = closed, null = no preselected variant
  const [reverseEntry, setReverseEntry] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isResolvingTag, setIsResolvingTag] = useState(false);

  const overviewQuery = useCurrentStockOverviewApi();
  // Always fetched (not only on the Log tab) — its count shows on the tab label.
  const adjustmentsQuery = useStockAdjustmentsApi();

  const overview = overviewQuery.data?.data;
  const variants = useMemo(() => overview?.variants ?? [], [overview]);
  const adjustments = useMemo(() => adjustmentsQuery.data?.data ?? [], [adjustmentsQuery.data]);

  const filtered = useMemo(() => filterVariants(variants, filters), [variants, filters]);
  const designs = useMemo(() => groupByDesign(variants).map((group) => group.design), [variants]);

  // Chip counts use the same filter the list uses, so a chip's number always matches what it shows.
  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_FILTERS.map((option) => [
          option.id,
          option.id === "all" ? variants.length : filterVariants(variants, { query: "", status: option.id, designId: "", sort: "code" }).length,
        ]),
      ),
    [variants],
  );

  const isFiltered = Boolean(filters.query.trim() || filters.status !== "all" || filters.designId);
  const hasAnyFilter = isFiltered || filters.sort !== DEFAULT_FILTERS.sort;

  // The log tab shares the search box + design filter, matched against its own fields.
  const filteredAdjustments = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return adjustments.filter((entry) => {
      if (filters.designId && String(entry.design.id) !== String(filters.designId)) return false;
      if (!q) return true;
      return [`ADJ-${String(entry.id).padStart(4, "0")}`, entry.design.code, entry.design.name, entry.variant.colorName, entry.reason, entry.note, entry.createdBy]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [adjustments, filters.query, filters.designId]);

  const setFilter = (patch) => setFilters((current) => ({ ...current, ...patch }));

  const openDrawer = useCallback((colorVariantId) => setDrawerVariantId(colorVariantId), []);
  const closeDrawer = useCallback(() => setDrawerVariantId(null), []);
  const closePrint = useCallback(() => setIsPrinting(false), []);

  // "/" focuses the search box, as long as the user isn't already typing somewhere.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active && (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.isContentEditable)) return;
      event.preventDefault();
      document.getElementById("stock-search")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Enter in the search box: if it's a tag ID (QR short code), jump straight to that variant.
  const handleSearchKeyDown = async (event) => {
    if (event.key !== "Enter") return;
    const code = filters.query.trim();
    if (!code || code.includes(" ")) return;
    setIsResolvingTag(true);
    try {
      const result = await resolveStockTagApi(code);
      openDrawer(result.data.colorVariantId);
    } catch {
      if (filtered.length === 0) toast.info(`No design, colour or tag matches "${code}".`);
    } finally {
      setIsResolvingTag(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("Nothing to export — clear the filters first.");
      return;
    }
    const fileName = downloadCurrentStockCsv(filtered, overview?.asOn ?? "today");
    toast.success(`Downloaded ${fileName}`);
  };

  const countLabel =
    tab === "log"
      ? `${filteredAdjustments.length} entr${filteredAdjustments.length === 1 ? "y" : "ies"}`
      : `${filtered.length} colour${filtered.length === 1 ? "" : "s"}`;

  if (overviewQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Loading current stock…
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center text-sm">
        <p className="text-red-600">{overviewQuery.error.message}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => overviewQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const coloursWithStock = variants.filter((variant) => variant.totalPieces > 0).length;

  return (
    <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Current Stock</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
            <SyncStatus updatedAt={overviewQuery.dataUpdatedAt} busy={overviewQuery.isFetching} />
            <button type="button" onClick={() => overviewQuery.refetch()} className="rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold text-emerald-700 hover:bg-emerald-50">
              Refresh
            </button>
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Lock className="size-3" /> View only · stock changes through Stock In, Stock Out and returns
            </span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setIsPrinting(true)} className="gap-2 text-[13px] font-semibold">
            <Printer className="size-3.5" />
            Print report
          </Button>
          <Button type="button" variant="outline" onClick={handleExport} className="gap-2 text-[13px] font-semibold">
            <Download className="size-3.5" />
            Export (Excel)
          </Button>
          <Button
            type="button"
            onClick={() => setAddStockFor(null)}
            disabled={variants.length === 0}
            className="gap-2 bg-emerald-600 text-[13px] font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Add stock
          </Button>
        </div>
      </header>

      {/* Four numbers in one strip: two columns on phones, a single row from `sm` up. */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5 bg-white px-4 py-3">
          <span className="font-mono text-xl font-bold leading-tight text-slate-900">{formatNumber(sumBy(variants, (variant) => variant.totalPieces))}</span>
          <span className="text-[12.5px] text-slate-500">Pieces in stock</span>
        </div>
        <div className="flex flex-col gap-0.5 bg-white px-4 py-3">
          <span className="font-mono text-xl font-bold leading-tight text-slate-900">
            {sumBy(variants, (variant) => variant.sets)} <span className="text-slate-400">·</span>{" "}
            {sumBy(variants, (variant) => variant.semiSets)} <span className="text-slate-400">·</span>{" "}
            {sumBy(variants, (variant) => variant.loosePieces)}
          </span>
          <span className="text-[12.5px] text-slate-500">Sets · semi sets · loose pcs</span>
        </div>
        <div className="flex flex-col gap-0.5 bg-white px-4 py-3">
          <span className="font-mono text-xl font-bold leading-tight text-emerald-700">{formatInr(sumBy(variants, (variant) => variant.value))}</span>
          <span className="text-[12.5px] text-slate-500">Stock value at selling rate</span>
        </div>
        <div className="flex flex-col gap-0.5 bg-white px-4 py-3">
          <span className="font-mono text-xl font-bold leading-tight text-slate-900">
            {coloursWithStock} <span className="text-sm font-semibold text-slate-400">of {variants.length}</span>
          </span>
          <span className="text-[12.5px] text-slate-500">Colours with stock</span>
        </div>
      </section>

      <Sheet>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-none gap-0.5 overflow-x-auto rounded-[10px] bg-slate-100 p-[3px]">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[7px] px-3.5 py-1.5 text-[12.6px] font-semibold text-slate-500",
                tab === value && "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1)]",
              )}
            >
              {label}
              {value === "log" && <span className="ml-1.5 font-mono text-[11px] text-slate-400">{adjustments.length}</span>}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
            {isResolvingTag ? <Loader2 className="size-[18px] animate-spin" /> : <Search className="size-[18px]" />}
          </span>
          <input
            id="stock-search"
            value={filters.query}
            onChange={(event) => setFilter({ query: event.target.value })}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            spellCheck={false}
            placeholder="Design code, name, colour — or paste a tag ID and press Enter"
            className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50/70 py-3 pl-11 pr-12 font-mono text-[14px] text-slate-900 outline-none placeholder:text-emerald-900/40 focus:border-emerald-500"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-emerald-200 bg-white px-1.5 font-mono text-[11px] text-emerald-700 sm:block">/</kbd>
        </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tab !== "log" && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
              {STATUS_FILTERS.map((option) => {
                const active = filters.status === option.id;
                const count = statusCounts[option.id] ?? 0;
                const warn = (option.id === "out" || option.id === "low") && count > 0 && !active;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter({ status: option.id })}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                      active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      !count && !active && "opacity-50",
                    )}
                  >
                    {option.label}
                    <span className={cn("font-mono text-[11.5px]", active ? "text-white/70" : warn ? "font-bold text-red-600" : "text-slate-400")}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          <select className={SELECT} value={filters.designId} onChange={(event) => setFilter({ designId: event.target.value })} aria-label="Filter by design">
            <option value="">All designs</option>
            {designs.map((design) => (
              <option key={design.id} value={design.id}>
                {design.code} · {design.name}
              </option>
            ))}
          </select>
          {tab === "stock" && (
            <select className={SELECT} value={filters.sort} onChange={(event) => setFilter({ sort: event.target.value })} aria-label="Sort">
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {hasAnyFilter && (
            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="px-1.5 py-1.5 text-[13px] text-slate-500 hover:text-slate-900">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-[12.5px] text-slate-400">{countLabel}</span>
        </div>

        <div className="mt-4">
          {tab === "stock" && (
            <StockTable
              variants={filtered}
              expanded={expanded}
              forceOpen={isFiltered}
              onToggle={(designId) => setExpanded((current) => ({ ...current, [designId]: !current[designId] }))}
              onOpen={openDrawer}
            />
          )}
          {tab === "matrix" && <SizeMatrix variants={filtered} onOpen={openDrawer} />}
          {tab === "log" && (
            <AdjustmentLog
              entries={filteredAdjustments}
              isLoading={adjustmentsQuery.isLoading}
              error={adjustmentsQuery.error}
              onReverse={setReverseEntry}
            />
          )}
        </div>

        {tab === "stock" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            Low when a colour’s pieces fall to its limit.
            <span className="ml-auto inline-flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-baseline gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[12px] font-bold text-red-700">
                <b className="font-sans text-[10px] font-semibold opacity-60">M</b>0
              </span>
              none left
              <span className="inline-flex items-baseline gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[12px] font-bold text-amber-700">
                <b className="font-sans text-[10px] font-semibold opacity-60">L</b>2
              </span>
              running low
            </span>
          </div>
        )}
      </Sheet>

      {drawerVariantId && (
        <VariantDrawer
          colorVariantId={drawerVariantId}
          ageingDays={overview?.ageingDays ?? 60}
          onClose={closeDrawer}
          onAddStock={(colorVariantId) => setAddStockFor(colorVariantId)}
        />
      )}

      {addStockFor !== undefined && (
        <AddStockDialog variants={variants} initialVariantId={addStockFor} onClose={() => setAddStockFor(undefined)} />
      )}

      {reverseEntry && <ReverseDialog entry={reverseEntry} onClose={() => setReverseEntry(null)} />}

      {isPrinting && <PrintReport variants={filtered} asOn={overview?.asOn} isFiltered={isFiltered} onClose={closePrint} />}
    </div>
  );
};

export default CurrentStock;

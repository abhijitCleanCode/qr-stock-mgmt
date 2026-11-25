import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Ban, Check, ChevronLeft, ChevronRight, Download, Eye, FileDown, Loader2, Lock, MoreHorizontal, Pencil, Printer, QrCode, Search } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStockInChallansApi } from "../../../hooks/useStockInChallansApi";
import { getStockInChallansApi } from "../../../services/stockInChallan.api";
import { DEFAULT_CHALLAN_FILTERS as DEFAULT_FILTERS } from "../../../utils/challanFilters";
import { downloadChallanRegisterCsv } from "../../../utils/challanExport";
import { formatDateOnly } from "../../../utils/stockHistoryLabels";

const PAGE_SIZE = 8;

const STATUS_TABS = [
  ["active", "Active"],
  ["defects", "With defects"],
  ["edited", "Edited"],
  ["dropped", "Dropped"],
  ["all", "All"],
];

const DATE_OPTIONS = [
  ["", "Any date"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["90", "Last 90 days"],
  ["90+", "Older than 90 days"],
  ["custom", "Custom range…"],
];

const TAG_OPTIONS = [
  ["", "All tag states"],
  ["none", "Not printed"],
  ["part", "Partly printed"],
  ["done", "Printed"],
  ["pending", "Tags to print"],
];

const SORT_OPTIONS = [
  ["new", "Newest first"],
  ["old", "Oldest first"],
  ["pcs", "Most pieces"],
];

const selectClass =
  "h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/10";

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// Page numbers with gaps: first, last, and the pages next to the current one.
const pageItems = (current, last) => {
  const items = [];
  for (let page = 1; page <= last; page += 1) {
    if (page === 1 || page === last || Math.abs(page - current) <= 1) items.push(page);
    else if (items[items.length - 1] !== "…") items.push("…");
  }
  return items;
};

const SerialBadge = ({ label, dropped }) => (
  <span
    className={cn(
      "whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900",
      dropped && "text-slate-400 line-through",
    )}
  >
    {label}
  </span>
);

const Mark = ({ tone, children }) => (
  <span
    className={cn(
      "rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
      tone === "red" ? "border-red-200 bg-red-50 text-red-600" : "border-blue-200 bg-blue-50 text-blue-700",
    )}
  >
    {children}
  </span>
);

// Colour swatches for the challan's designs. At most four show. With more, the fourth is half-faded
// and carries "+N" for the rest, so it's clear there are more designs behind it.
const MAX_SWATCHES = 4;

const GoodsCell = ({ challan }) => {
  const variants = challan.variants ?? [];
  const overflow = variants.length > MAX_SWATCHES;
  const shown = overflow ? variants.slice(0, MAX_SWATCHES - 1) : variants;
  const hidden = variants.length - shown.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        {shown.map((variant, index) => (
          <span
            key={`${variant.designCode}-${variant.colorName}`}
            title={`${variant.designCode} · ${variant.colorName}`}
            className={cn("size-6 rounded-md border-2 border-white shadow-[0_0_0_1px_rgb(226_232_240)]", index > 0 && "-ml-1.5")}
            style={{ backgroundColor: variant.colorHex }}
          />
        ))}
        {overflow && (
          <span
            title={`${hidden} more design${hidden === 1 ? "" : "s"}: ${variants.slice(MAX_SWATCHES - 1).map((v) => `${v.designCode} · ${v.colorName}`).join(", ")}`}
            className="relative -ml-1.5 grid size-6 place-items-center overflow-hidden rounded-md border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700 shadow-[0_0_0_1px_rgb(226_232_240)]"
          >
            <span className="absolute inset-0 opacity-50" style={{ backgroundColor: variants[MAX_SWATCHES - 1]?.colorHex }} />
            <span className="relative">+{hidden}</span>
          </span>
        )}
      </div>
      <div className="font-mono text-[13px] font-bold text-slate-900">
        {challan.totalPieces} <span className="text-[11px] font-normal text-slate-400">pcs</span>
      </div>
    </div>
  );
};

// Tag progress as a ring plus "printed/total", as on the prototype. Nothing shows when no tags exist.
const RING_RADIUS = 6;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const TagsCell = ({ challan }) => {
  if (challan.status === "DROPPED") return <span className="text-slate-300">—</span>;
  if (challan.qrCount === 0) return <span className="text-[12px] text-slate-400">No tags</span>;
  if (challan.printedCount >= challan.qrCount) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
        <Check className="size-3" /> Printed
      </span>
    );
  }
  const none = challan.printedCount === 0;
  const fraction = challan.printedCount / challan.qrCount;
  return (
    <span
      title={`${challan.printedCount} of ${challan.qrCount} tags printed`}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 pl-1 pr-2.5 font-mono text-[12px] text-slate-500",
        none ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white",
      )}
    >
      <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden="true">
        <circle cx="8" cy="8" r={RING_RADIUS} fill="none" strokeWidth="3" className={none ? "stroke-amber-200" : "stroke-slate-200"} />
        {fraction > 0 && (
          <circle
            cx="8"
            cy="8"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-amber-500"
            strokeDasharray={`${fraction * RING_LENGTH} ${RING_LENGTH}`}
          />
        )}
      </svg>
      <span>
        <b className={cn("font-bold", none ? "text-amber-700" : "text-slate-900")}>{challan.printedCount}</b>/{challan.qrCount}
      </span>
    </span>
  );
};

const QcCell = ({ challan }) => {
  if (challan.status === "DROPPED") return <span className="text-slate-300">—</span>;
  return challan.defective ? (
    <span className="text-[12px] font-semibold text-red-600">{challan.defective} defective</span>
  ) : (
    <span className="text-[12px] font-semibold text-emerald-600">All passed</span>
  );
};

// One primary action (View) per row; printing, PDF, QR tags and drop live under ⋯.
const RowActions = ({ challan, onView, onPrint, onPdf, onQr, onEdit, onDrop }) => {
  const dropped = challan.status === "DROPPED";
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={() => onView(challan)} className="h-8 gap-1.5 rounded-lg text-xs">
        <Eye className="size-3.5" /> View
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon-sm" aria-label="More actions" className="rounded-lg">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => onPrint(challan)}><Printer className="size-4" /> Print challan</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPdf(challan)}><FileDown className="size-4" /> Download PDF</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onQr(challan)}><QrCode className="size-4" /> {dropped ? "Retired QR tags" : "View QR tags"}</DropdownMenuItem>
          {!dropped && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(challan)}><Pencil className="size-4" /> Edit details</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDrop(challan)}><Ban className="size-4" /> Drop challan</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const ChallanRegister = ({ filters, onFiltersChange: setFilters, onView, onPrint, onPdf, onEdit, onDrop }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim(),
      jobber: filters.jobber,
      dateRange: filters.dateRange,
      from: filters.dateRange === "custom" ? filters.from : "",
      to: filters.dateRange === "custom" ? filters.to : "",
      status: filters.status,
      tagState: filters.tagState,
      sort: filters.sort,
    }),
    [debouncedSearch, filters],
  );

  const { data, isLoading, isError, error, isFetching } = useStockInChallansApi({ ...query, page, limit: PAGE_SIZE });
  const result = data?.data;
  const rows = result?.items ?? [];
  const total = result?.total ?? 0;
  const counts = result?.counts;
  const serials = result?.serials;
  const jobbers = result?.jobbers ?? [];
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If a save or drop leaves fewer pages than the current one, step back to the last page.
  // Adjusted during render (React's pattern for state derived from props) rather than in an effect.
  if (page > lastPage) setPage(lastPage);

  // "/" focuses the search box, as long as the user isn't already typing somewhere.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active && (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.isContentEditable)) return;
      event.preventDefault();
      document.getElementById("challan-search")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const openQr = (challan) => navigate(`/qr-center?challan=${encodeURIComponent(challan.challanNo)}`);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await getStockInChallansApi({ ...query, page: 1, limit: 500 });
      const items = response.data.items;
      downloadChallanRegisterCsv(items, `stock-in-register-${todayIso()}.csv`);
      toast.success(`Exported ${items.length} challan${items.length === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err?.message ?? "Couldn't export the register.");
    } finally {
      setIsExporting(false);
    }
  };

  const actions = { onView, onPrint, onPdf, onQr: openQr, onEdit, onDrop };
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <div>
      {/* Toolbar: search, then one row of filters, then status chips. */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-emerald-600" />
          <Input
            id="challan-search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search serial, challan no., jobber or design"
            autoComplete="off"
            className="h-11 rounded-xl border-emerald-200 bg-emerald-50/70 pl-10 pr-10 font-mono text-sm placeholder:text-emerald-900/40 focus-visible:border-emerald-500"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-emerald-200 bg-white px-1.5 font-mono text-[11px] text-emerald-700 sm:block">/</kbd>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className={cn(selectClass, "flex-1 sm:flex-none", filters.jobber && "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800")} value={filters.jobber} onChange={(e) => set({ jobber: e.target.value })} aria-label="Jobber">
            <option value="">All jobbers</option>
            {jobbers.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className={cn(selectClass, "flex-1 sm:flex-none", filters.dateRange && "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800")} value={filters.dateRange} onChange={(e) => set({ dateRange: e.target.value, from: "", to: "" })} aria-label="Date range">
            {DATE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {filters.dateRange === "custom" && (
            <span className="inline-flex flex-wrap items-center gap-2 text-xs text-slate-500">
              From <input type="date" max={filters.to || todayIso()} value={filters.from} onChange={(e) => set({ from: e.target.value, to: filters.to && e.target.value > filters.to ? e.target.value : filters.to })} className={selectClass} />
              – To <input type="date" min={filters.from} max={todayIso()} value={filters.to} onChange={(e) => set({ to: e.target.value, from: filters.from && e.target.value < filters.from ? e.target.value : filters.from })} className={selectClass} />
            </span>
          )}
          <select className={cn(selectClass, "flex-1 sm:flex-none", filters.tagState && "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800")} value={filters.tagState} onChange={(e) => set({ tagState: e.target.value })} aria-label="Tag state">
            {TAG_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className={cn(selectClass, "flex-1 sm:flex-none")} value={filters.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {isFiltered && (
            <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }} className="px-1 text-[13px] text-slate-500 hover:text-slate-900">
              Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">{isFetching && <Loader2 className="mr-1 inline size-3 animate-spin" />}{total} challan{total === 1 ? "" : "s"}</span>
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={isExporting || total === 0} className="gap-1.5">
              {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Status">
          {STATUS_TABS.map(([value, label]) => {
            const active = filters.status === value;
            const count = counts?.[value] ?? 0;
            const warn = value === "defects" && count > 0 && !active;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => set({ status: value })}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {label}
                <span className={cn("font-mono text-[11.5px]", active ? "text-white/70" : warn ? "font-bold text-red-600" : "text-slate-400")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-red-600">{error.message}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <b className="block text-[15px] text-slate-900">No challans match</b>
            Try another search or filter, or clear them.
          </div>
        ) : (
          <>
            {/* Phones: one card per challan. */}
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((challan) => {
                const dropped = challan.status === "DROPPED";
                return (
                  <div key={challan.id} className={cn("flex flex-col gap-2.5 px-4 py-3.5", dropped && "bg-slate-50 text-slate-500")}>
                    <div className="flex items-center gap-2">
                      <SerialBadge label={challan.serialLabel} dropped={dropped} />
                      <span className={cn("font-mono text-[13px] font-bold text-slate-900", dropped && "text-slate-400 line-through")}>{challan.challanNo}</span>
                      {challan.edited && <Mark>EDITED</Mark>}
                      {dropped && <Mark tone="red">DROPPED</Mark>}
                      <span className="ml-auto text-[11.5px] text-slate-400">{formatDateOnly(challan.stockDate)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px]">
                      <span className="min-w-0 truncate font-medium text-slate-800">{challan.jobberName ?? "—"}</span>
                      <span className="ml-auto shrink-0"><QcCell challan={challan} /></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <GoodsCell challan={challan} />
                      <span className="ml-auto"><TagsCell challan={challan} /></span>
                    </div>
                    <RowActions challan={challan} {...actions} />
                  </div>
                );
              })}
            </div>

            {/* Tablet and up: one line per challan. */}
            <div className="hidden max-h-130 overflow-y-auto md:block">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 z-1 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">
                      <button
                        type="button"
                        onClick={() => set({ sort: filters.sort === "old" ? "new" : "old" })}
                        className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-slate-700"
                        title="Flip newest and oldest"
                      >
                        Serial <span className="normal-case tracking-normal text-slate-500">{filters.sort === "old" ? "↑ oldest" : "↓ newest"}</span>
                      </button>
                    </th>
                    <th className="px-3 py-2.5 font-bold">Challan · date</th>
                    <th className="px-3 py-2.5 font-bold">Jobber</th>
                    <th className="px-3 py-2.5 font-bold">Goods received</th>
                    <th className="px-3 py-2.5 font-bold">QC</th>
                    <th className="px-3 py-2.5 font-bold">Tags</th>
                    <th className="px-4 py-2.5 text-right font-bold"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((challan) => {
                    const dropped = challan.status === "DROPPED";
                    return (
                      <tr key={challan.id} className={cn("border-t border-slate-100 align-middle hover:bg-slate-50/70", dropped && "bg-slate-50 text-slate-500")}>
                        <td className="px-4 py-3">
                          <SerialBadge label={challan.serialLabel} dropped={dropped} />
                          {dropped && <div className="mt-1"><Mark tone="red">DROPPED</Mark></div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className={cn("flex items-center gap-1.5 font-mono text-[12.8px] font-bold text-slate-900", dropped && "text-slate-400 line-through")}>
                            {challan.challanNo}
                            {challan.edited && <Mark>EDITED</Mark>}
                          </div>
                          <div className="mt-0.5 text-[11.6px] text-slate-400">{formatDateOnly(challan.stockDate)}</div>
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">{challan.jobberName ?? "—"}</td>
                        <td className="px-3 py-3"><GoodsCell challan={challan} /></td>
                        <td className="px-3 py-3"><QcCell challan={challan} /></td>
                        <td className="px-3 py-3"><TagsCell challan={challan} /></td>
                        <td className="px-4 py-3"><RowActions challan={challan} {...actions} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <span className="text-[13px] text-slate-500">
            Showing <b className="font-mono text-slate-900">{from}–{to}</b> of <b className="font-mono text-slate-900">{total}</b>
          </span>
          {lastPage > 1 && (
            <nav className="ml-auto flex items-center gap-1" aria-label="Pages">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              {pageItems(page, lastPage).map((item, index) =>
                item === "…" ? (
                  <span key={`gap-${index}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => setPage(item)}
                    className={cn(
                      "h-8 min-w-8 rounded-lg border px-2 font-mono text-[12.5px] font-semibold",
                      item === page ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="Next page"
                disabled={page === lastPage}
                onClick={() => setPage(page + 1)}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </div>
      </div>

      {serials?.last && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Lock className="size-3" /> Serial nos. <b className="font-mono">{serials.first}</b> – <b className="font-mono">{serials.last}</b> issued · next stock-in gets{" "}
          <b className="font-mono">{serials.next}</b>
          {serials.dropped.length > 0 && (
            <> · dropped (never reused): {serials.dropped.map((label) => (
              <span key={label} className="rounded-md border border-slate-200 bg-white px-1.5 font-mono text-slate-400 line-through">{label}</span>
            ))}</>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallanRegister;

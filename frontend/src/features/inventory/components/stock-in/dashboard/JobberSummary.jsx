import { useState } from "react";
import { ArrowRight, Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useStockInJobberSummaryApi } from "../../../hooks/useStockInChallansApi";
import { formatDateOnly } from "../../../utils/stockHistoryLabels";

const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

// Active challans rolled up by jobber. The bar shows each jobber's share of the biggest volume.
const JobberSummary = ({ onOpenJobber }) => {
  const { data, isLoading, isError, error } = useStockInJobberSummaryApi();
  const [query, setQuery] = useState("");
  const rows = data?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
  if (isError) return <div className="py-10 text-center text-sm text-red-600">{error.message}</div>;
  if (rows.length === 0) return <div className="py-12 text-center text-sm text-slate-500"><b className="block text-[15px] text-slate-900">No challans yet</b></div>;

  const needle = query.trim().toLowerCase();
  const visible = needle ? rows.filter((row) => row.jobberName.toLowerCase().includes(needle)) : rows;
  const max = Math.max(...rows.map((row) => row.pieces ?? 0), 1);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-emerald-600" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search jobbers"
          aria-label="Search jobbers"
          autoComplete="off"
          className="h-10 rounded-xl border-emerald-200 bg-emerald-50/70 pl-10 text-sm placeholder:text-emerald-900/40 focus-visible:border-emerald-500"
        />
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500"><b className="block text-[15px] text-slate-900">No jobber matches</b>Try another name.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {visible.map((row) => {
            const share = ((row.pieces ?? 0) / max) * 100;
            return (
              <button
                key={row.jobberName}
                type="button"
                onClick={() => onOpenJobber(row.jobberName)}
                className="group grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-b-0 hover:bg-slate-50/70"
              >
                <span className="grid size-10 place-items-center rounded-[10px] bg-slate-100 text-[13px] font-bold text-slate-800">{initials(row.jobberName)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold text-slate-900">{row.jobberName}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-slate-500">
                    <span><b className="font-mono text-slate-800">{row.challanCount}</b> challan{row.challanCount === 1 ? "" : "s"}</span>
                    <span><b className="font-mono text-slate-800">{row.pieces?.toLocaleString("en-IN")}</b> pcs</span>
                    {row.defective > 0 ? (
                      <span className="font-semibold text-red-600">{row.defective} defective</span>
                    ) : (
                      <span className="text-emerald-600">no defects</span>
                    )}
                    {row.lastSerialLabel && (
                      <span>last <b className="font-mono text-slate-800">{row.lastSerialLabel}</b>{row.lastDate ? ` · ${formatDateOnly(row.lastDate)}` : ""}</span>
                    )}
                  </span>
                  <span className="mt-2 block h-1 max-w-xs overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 group-hover:bg-slate-50">
                  Challans <ArrowRight className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobberSummary;

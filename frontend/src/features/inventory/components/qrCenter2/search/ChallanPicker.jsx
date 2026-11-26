import { ChevronRight } from "lucide-react";

import { EmptyState, LIST_SCROLL, ListBox } from "../shared/primitives.jsx";
import { formatDateOnly } from "../../../utils/stockHistoryLabels";

const Count = ({ value, label }) => (
    <span className={value ? "text-slate-700" : "text-slate-300"}>
        <b className="font-mono font-semibold">{value}</b> {label}
    </span>
);

// Step one of a reprint: the challans whose tags match the search, newest first. Choosing one
// lists that challan's sets, semi sets and loose pieces. Only one challan is picked at a time.
export default function ChallanPicker({ challans, loading, hasQuery, onSelect }) {
    if (!hasQuery) {
        return (
            <ListBox className="mt-4">
                <EmptyState title="Search or filter to begin">
                    Type a challan number, a design code, or a QR ID. The matching challans appear here, newest first. Pick one to see its sets, semi sets and loose pieces.
                </EmptyState>
            </ListBox>
        );
    }
    if (loading && !challans) {
        return <ListBox className="mt-4"><EmptyState>Searching…</EmptyState></ListBox>;
    }
    if (!challans?.length) {
        return (
            <ListBox className="mt-4">
                <EmptyState title="No challan matches">Check the challan number, or widen the filters.</EmptyState>
            </ListBox>
        );
    }

    return (
        <ListBox className={`mt-4 ${LIST_SCROLL}`}>
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <span className="w-[120px] flex-none">Challan</span>
                <span className="min-w-0 flex-1">Jobber · date</span>
                <span className="hidden sm:block">Tags</span>
                <span className="w-4" />
            </div>
            {challans.map((challan) => (
                <button
                    key={challan.challanId}
                    type="button"
                    onClick={() => onSelect(challan)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left last:border-b-0 hover:bg-slate-50 sm:px-4"
                >
                    <span className="w-[120px] flex-none font-mono text-[13.5px] font-bold text-slate-900">Challan {challan.challanNo}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-800">{challan.jobberName ?? "—"}</span>
                        <span className="block text-[12px] text-slate-500">{formatDateOnly(challan.stockDate)}</span>
                    </span>
                    <span className="hidden flex-col gap-0.5 text-right text-[12px] sm:flex">
                        <Count value={challan.sets} label="sets" />
                        <Count value={challan.semiSets} label="semi" />
                        <Count value={challan.loose} label="loose" />
                    </span>
                    <ChevronRight className="size-4 flex-none text-slate-400" />
                </button>
            ))}
        </ListBox>
    );
}

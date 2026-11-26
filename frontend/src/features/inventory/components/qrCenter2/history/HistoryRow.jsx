import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { ActionButton } from "../shared/primitives.jsx";
import { formatDateOnly } from "../../../utils/stockHistoryLabels";

// Up to four colour swatches. With more, the fourth is half-faded and carries "+N" for the rest.
const MAX_SWATCHES = 4;

function Swatches({ variants }) {
    const overflow = variants.length > MAX_SWATCHES;
    const shown = overflow ? variants.slice(0, MAX_SWATCHES - 1) : variants;
    const hidden = variants.length - shown.length;
    return (
        <div className="flex items-center">
            {shown.map((variant, index) => (
                <span
                    key={variant.transactionId}
                    title={`${variant.design.code} · ${variant.variant.colorName}`}
                    className={cn("size-6 rounded-md border-2 border-white shadow-[0_0_0_1px_rgb(226_232_240)]", index > 0 && "-ml-1.5")}
                    style={{ backgroundColor: variant.variant.colorHex }}
                />
            ))}
            {overflow && (
                <span
                    title={`${hidden} more: ${variants.slice(MAX_SWATCHES - 1).map((v) => `${v.design.code} · ${v.variant.colorName}`).join(", ")}`}
                    className="relative -ml-1.5 grid size-6 place-items-center overflow-hidden rounded-md border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700 shadow-[0_0_0_1px_rgb(226_232_240)]"
                >
                    <span className="absolute inset-0 opacity-50" style={{ backgroundColor: variants[MAX_SWATCHES - 1]?.variant.colorHex }} />
                    <span className="relative">+{hidden}</span>
                </span>
            )}
        </div>
    );
}

// Tag progress as a ring plus "printed/total", the same as the stock-in register.
const RING_RADIUS = 6;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function TagsCell({ printed, total }) {
    if (!total) return <span className="text-[12px] text-slate-400">No tags</span>;
    if (printed >= total) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
                <Check className="size-3" /> Printed
            </span>
        );
    }
    const none = printed === 0;
    const fraction = printed / total;
    return (
        <span
            title={`${printed} of ${total} tags printed`}
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
                <b className={cn("font-bold", none ? "text-amber-700" : "text-slate-900")}>{printed}</b>/{total}
            </span>
        </span>
    );
}

// One stock-in challan: its SF serial, the colours inwarded on it, how many sets, and tag progress.
export default function HistoryRow({ row, onOpen }) {
    const designCount = new Set(row.variants.map((variant) => variant.design.id)).size;
    const untagged = row.notTaggedCount > 0 ? `+${row.notTaggedCount} more can be tagged` : null;

    return (
        <div
            role="row"
            className={cn(
                "grid grid-cols-2 items-center gap-x-3.5 gap-y-3 border-b border-slate-200 p-3.5 text-[13.2px] text-slate-700 last:border-b-0 hover:bg-slate-50 sm:px-[18px] sm:py-4",
                "xl:grid-cols-[.7fr_1.1fr_1.4fr_.6fr_1.1fr_168px] xl:py-3.5",
                row.printStatus !== "done" ? "bg-amber-50/40" : "bg-white",
            )}
        >
            <div role="cell" className="col-span-2 xl:col-span-1">
                {row.serialLabel && (
                    <span className="inline-block whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                        {row.serialLabel}
                    </span>
                )}
            </div>

            <div role="cell" className="col-span-2 xl:col-span-1">
                <div className="font-mono text-[12.8px] font-bold text-slate-900">{row.challanNo ?? row.batchId}</div>
                <div className="mt-0.5 text-[11.6px] text-slate-400">{formatDateOnly(row.stockDate)}</div>
                {row.jobberName && <div className="mt-0.5 text-[11.6px] text-slate-500">{row.jobberName}</div>}
            </div>

            <div role="cell" className="col-span-2 xl:col-span-1">
                <Swatches variants={row.variants} />
                <div className="mt-1.5 text-[11.8px] text-slate-500">
                    {designCount} design{designCount === 1 ? "" : "s"} · {row.variants.length} colour{row.variants.length === 1 ? "" : "s"}
                </div>
            </div>

            <div role="cell">
                <span className="mr-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 xl:hidden">Sets</span>
                <span className="font-mono font-bold text-slate-900">{row.setCount}</span>
                <span className="ml-1 text-[11.5px] text-slate-400">sets</span>
            </div>

            <div role="cell">
                <TagsCell printed={row.printedCount} total={row.tagCount} />
                {untagged && <div className="mt-1 text-[11px] text-amber-700">{untagged}</div>}
            </div>

            <div role="cell" className="col-span-2 xl:col-span-1 xl:text-right">
                {row.printStatus === "done"
                    ? <ActionButton size="sm" className="w-full xl:w-auto" onClick={() => onOpen(row)}>Reprint</ActionButton>
                    : <ActionButton size="sm" variant="dark" className="w-full xl:w-auto" onClick={() => onOpen(row)}>Configure &amp; print</ActionButton>}
            </div>
        </div>
    );
}

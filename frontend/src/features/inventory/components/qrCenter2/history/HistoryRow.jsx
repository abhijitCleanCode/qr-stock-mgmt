import { cn } from "@/lib/utils";
import { ActionButton, Pill } from "../shared/primitives.jsx";

const PILL_TONE = { done: "ok", partial: "part", pending: "warn" };

// Below xl the row becomes a card: batch + design full width, then sets|tags, then status|action.
const CELL_FULL = "col-span-2 xl:col-span-1";

function Count({ value, unit }) {
    return <div className="font-mono tabular-nums">{value} <span className="text-[11.5px] text-slate-400">{unit}</span></div>;
}

export default function HistoryRow({ row, onConfigure, onView }) {
    const tone = PILL_TONE[row.printStatus] ?? "neu";
    const label = row.printStatus === "partial"
        ? `${row.printedCount} of ${row.totalCount}`
        : row.printStatus === "done"
            ? `${row.printedCount} printed`
            : "Not printed";

    return (
        <div
            className={cn(
                "grid grid-cols-2 items-center gap-x-3.5 gap-y-2 border-b border-slate-200 p-3.5 text-[13.2px] text-slate-700 last:border-b-0 hover:bg-slate-50 sm:px-[18px] sm:py-4",
                "xl:grid-cols-[2fr_1.7fr_1fr_1fr_1.2fr_150px] xl:py-3.5",
                row.printStatus !== "done" ? "bg-amber-50/40" : "bg-white",
            )}
        >
            <div className={CELL_FULL}>
                <div className="font-mono text-[12.8px] font-semibold text-slate-900">{row.challanNo ?? `#${row.registrationId}`}</div>
                <div className="mt-0.5 text-[11.8px] text-slate-400">{row.displayDate ? new Date(row.displayDate).toLocaleDateString() : ""}</div>
            </div>
            <div className={CELL_FULL}>
                <span className="mr-1.5 inline-block size-[9px] rounded-full align-middle" style={{ backgroundColor: row.variant.colorHex }} />
                <b className="text-slate-900">{row.design.code}</b> {row.variant.colorName}
                <div className="mt-0.5 text-[11.8px] text-slate-400">{row.design.name}</div>
            </div>
            <Count value={row.typeCounts.SET} unit="sets" />
            <Count value={row.totalCount} unit="tags" />
            <div><Pill tone={tone}>{label}</Pill></div>
            <div className="text-right">
                {row.printStatus === "done"
                    ? <ActionButton size="sm" onClick={() => onView(row)}>View tags</ActionButton>
                    : <ActionButton size="sm" variant="dark" onClick={() => onConfigure(row)}>Configure &amp; print</ActionButton>}
            </div>
        </div>
    );
}

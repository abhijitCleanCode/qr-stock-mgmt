import { useState } from "react";

import { cn } from "@/lib/utils";

const REASONS = [
    ["LOST", "Lost"],
    ["TORN", "Torn"],
    ["FADED", "Faded"],
    ["REBAG", "Rebag"],
    ["JAM", "Jam"],
    ["PRICE_CHANGE", "Price change"],
];

// Asks why the selected tags are being printed again. A reason is required: it is logged on every
// tag's reprint record before the Configure & print studio opens.
export default function ReprintReasonDialog({ count, submitting, onCancel, onConfirm }) {
    const [reason, setReason] = useState(null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reprint-reason-title">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h2 id="reprint-reason-title" className="text-lg font-bold text-slate-900">
                    Reprint {count} tag{count === 1 ? "" : "s"}
                </h2>
                <p className="mt-1 text-[13px] text-slate-500">Choose why these are being printed again. The reason is logged before printing.</p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                    {REASONS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={reason === value}
                            onClick={() => setReason(value)}
                            className={cn(
                                "rounded-[9px] border-[1.5px] px-3 py-2.5 text-center text-[13px] font-semibold",
                                reason === value ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} disabled={submitting} className="h-10 rounded-lg border border-slate-200 px-4 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!reason || submitting}
                        onClick={() => onConfirm(reason)}
                        className="h-10 rounded-lg bg-emerald-600 px-4 text-[13.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {submitting ? "Logging…" : "Continue to print"}
                    </button>
                </div>
            </div>
        </div>
    );
}

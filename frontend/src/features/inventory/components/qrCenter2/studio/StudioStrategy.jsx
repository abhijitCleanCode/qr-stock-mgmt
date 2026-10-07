// Two independent switches, both on by default — which tags this print covers:
//   · Parent + Child — a tag on every sealed set and semi set, plus a hang tag on every piece.
//   · Loose pieces   — the odd pieces the jobber made outside a set.
// Counts are "if this switch were on"; a tag with no code yet gets one when it is first printed.
const OPTIONS = [
    {
        key: "parentChild",
        name: "Parent + Child",
        description: "A bundle tag on every sealed set and semi set, plus a hang tag on every piece. Right when the piece needs a printed MRP tag anyway — the QR then rides along for free.",
    },
    {
        key: "loose",
        name: "Loose pieces",
        description: "Only the odd pieces the jobber made outside a set. Untick when the sets are already tagged, or when you are printing a sets-only challan.",
    },
];

export default function StudioStrategy({ counts, newCounts, tagParentChild, tagLoose, onToggleParentChild, onToggleLoose }) {
    const checked = { parentChild: tagParentChild, loose: tagLoose };
    const toggles = { parentChild: onToggleParentChild, loose: onToggleLoose };

    const note = !tagParentChild && !tagLoose
        ? { tone: "amber", icon: "⚠", body: <><b>No tags will be generated.</b> Tick at least one tag type to print labels for this batch.</> }
        : !tagParentChild
            ? { tone: "amber", icon: "⚠", body: <><b>Set and semi-set bundles will stay untagged.</b> Their codes are already issued — print them here before the goods reach a rack, or nobody can scan them.</> }
            : !tagLoose
                ? { tone: "amber", icon: "⚠", body: <><b>Loose pieces will stay untagged.</b> Print their labels here before they reach a rack.</> }
                : { tone: "green", icon: "✓", body: <><b>Every tag keeps its id for life.</b> A tag that already has a code reuses it; a piece that never had one is given its code the moment you print — and later reprints reuse that same code, never a new one.</> };

    return (
        <div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {OPTIONS.map((option) => {
                    const on = checked[option.key];
                    return (
                        <button
                            key={option.key}
                            type="button"
                            aria-pressed={on}
                            onClick={toggles[option.key]}
                            className={`block w-full rounded-xl border-[1.5px] bg-white p-4 text-left transition-colors ${on ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 hover:border-slate-300"}`}
                        >
                            <div className="mb-1.5 flex items-center gap-2">
                                <span className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] text-xs leading-none text-white ${on ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}>
                                    {on ? "✓" : ""}
                                </span>
                                <span className="text-[13.5px] font-semibold text-slate-900">{option.name}</span>
                            </div>
                            <p className="mb-3 text-[12.3px] leading-snug text-slate-500">{option.description}</p>
                            <div className="border-t border-dashed border-slate-200 pt-2.5">
                                <div className={`font-mono text-sm font-bold tabular-nums ${on ? "text-emerald-700" : "text-slate-900"}`}>{counts[option.key]}</div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {on ? "Tags" : "Tags · not generated"}
                                    {on && newCounts[option.key] > 0 && <span className="ml-1.5 normal-case tracking-normal text-amber-700">· {newCounts[option.key]} get their code on print</span>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className={`mt-3 flex gap-2 rounded-lg border p-3 text-[12.3px] leading-snug ${note.tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                <span>{note.icon}</span>
                <div>{note.body}</div>
            </div>
        </div>
    );
}

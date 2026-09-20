import { strategyPreview } from "../../../utils/qrTagStudio";

// Exactly the two strategies the reference mock offers — no "parent only" / "custom mix"
// middle ground. "loose" here reuses the app's existing "parent" strategy value: parent
// SET/BUNDLE tags are always issued regardless of strategy (that never was optional), so
// what this choice actually toggles is only whether children get tagged too — which is
// precisely what "Loose pieces only" means, per the mock's own copy below.
const OPTIONS = [
  {
    k: "parentChild",
    n: "Parent + Child",
    d: "A bundle tag on every sealed set and semi set, plus a hang tag on every piece. Right when the piece needs a printed MRP tag anyway — the QR then rides along for free.",
  },
  {
    k: "parent",
    n: "Loose pieces only",
    d: "Only the odd pieces the jobber made outside a set. Use when the sets are already tagged, or when you are inwarding a loose-only challan.",
  },
];

const StrategyCards = ({ variants, strategy, perVariantSettings, onStrategyChange }) => {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {OPTIONS.map((opt) => {
          const preview = strategyPreview(variants, opt.k, perVariantSettings);
          const on = strategy === opt.k;
          return (
            <button
              key={opt.k}
              type="button"
              onClick={() => onStrategyChange(opt.k)}
              className={`block w-full rounded-xl border-[1.5px] bg-white p-4 text-left transition-colors ${
                on ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] ${
                    on ? "border-emerald-600" : "border-slate-300"
                  }`}
                >
                  {on && <span className="size-2 rounded-full bg-emerald-600" />}
                </span>
                <span className="text-[13.5px] font-semibold text-slate-900">{opt.n}</span>
              </div>
              <p className="mb-3 text-[12.3px] leading-snug text-slate-500">{opt.d}</p>
              <div className="flex gap-5 border-t border-dashed border-slate-200 pt-2.5">
                <div>
                  <div className={`font-mono text-sm font-bold tabular-nums ${on ? "text-emerald-700" : "text-slate-900"}`}>
                    {preview.total}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tags</div>
                </div>
                <div>
                  <div className={`font-mono text-sm font-bold tabular-nums ${on ? "text-emerald-700" : "text-slate-900"}`}>
                    ~{Math.max(1, preview.applyMinutes)} min
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">To apply</div>
                </div>
                <div>
                  <div className={`font-mono text-sm font-bold tabular-nums ${on ? "text-emerald-700" : "text-slate-900"}`}>
                    ₹{Math.round(preview.total * 0.3)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Media</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {strategy === "parentChild" ? (
          <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12.3px] leading-snug text-emerald-700">
            <span>✓</span>
            <div>
              <b>Codes are issued now, printed now.</b> Every piece in this challan gets a tag carrying the id it will
              keep for life — reprints later in QR Center reuse that same code, never a new one.
            </div>
          </div>
        ) : (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.3px] leading-snug text-amber-700">
            <span>⚠</span>
            <div>
              <b>Set and semi-set bundles will leave this batch untagged.</b> Their codes are still issued and the
              stock is registered, but the labels have to be printed from QR Center before the goods reach a rack, or
              nobody can scan them.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyCards;

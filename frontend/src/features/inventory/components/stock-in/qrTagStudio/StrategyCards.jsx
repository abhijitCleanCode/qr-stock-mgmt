import { strategyPreview } from "../../../utils/qrTagStudio";

const OPTIONS = [
  {
    k: "parent",
    n: "Parent only",
    d: "One tag per sealed set. Piece records are created in the database now; their tags print later, only if the set is ever broken.",
  },
  {
    k: "parentChild",
    n: "Parent + Child",
    d: "Every piece gets its own hang tag at inward. Right when the piece needs an MRP tag anyway — the QR then rides along for free.",
  },
  {
    k: "custom",
    n: "Loose Pieces",
    d: "Mix both. Child tags on the high-value variant, parent-only on the rest. Set it in the queue table below.",
  },
];

const StrategyCards = ({ variants, strategy, perVariantSettings, onStrategyChange }) => {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {OPTIONS.map((opt) => {
          const preview = strategyPreview(variants, opt.k === "custom" ? "parent" : opt.k, perVariantSettings);
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
              <div className="flex gap-4 border-t border-dashed border-slate-200 pt-2.5">
                <div>
                  <div className={`font-mono text-sm font-bold tabular-nums ${on ? "text-emerald-700" : "text-slate-900"}`}>
                    {preview.total}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tags</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {strategy === "parentChild" && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.3px] leading-snug text-amber-700">
            <span>⚠</span>
            <div>
              <b>Every piece tag has to be attached by hand.</b> Only worth it if these pieces were getting a printed
              MRP tag regardless — then the QR costs nothing extra. If they go straight into sealed poly and stay
              there, Parent only gets the same traceability for a fraction of the work, because the child records
              already exist in the database.
            </div>
          </div>
        )}
        {strategy === "custom" && (
          <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[12.3px] leading-snug text-emerald-700">
            <span>✓</span>
            <div>
              Set the <b>Child</b> toggle per variant in the queue below. Useful when one variant carries a much
              higher MRP and deserves piece-level tags from day one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyCards;

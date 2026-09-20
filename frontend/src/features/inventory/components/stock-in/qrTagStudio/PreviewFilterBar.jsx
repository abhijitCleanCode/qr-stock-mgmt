const FILTERS = [
  { k: "all", n: "All" },
  { k: "parent", n: "Parent" },
  { k: "child", n: "Child" },
  { k: "loose", n: "Loose" },
];

const PreviewFilterBar = ({ tags, filter, onFilterChange, zoom, onZoomChange }) => {
  const counts = {
    all: tags.length,
    parent: tags.filter((t) => t.kind === "parent").length,
    child: tags.filter((t) => t.kind === "child").length,
    loose: tags.filter((t) => t.kind === "loose").length,
  };
  const issueCount = tags.filter((t) => t.flags?.length).length;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
      {FILTERS.map((f) => (
        <button
          key={f.k}
          type="button"
          disabled={counts[f.k] === 0}
          onClick={() => onFilterChange(f.k)}
          className={`rounded-full border px-3 py-1 text-[11.8px] font-semibold disabled:opacity-40 ${
            filter === f.k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          {f.n} <b className="font-mono">{counts[f.k]}</b>
        </button>
      ))}
      <button
        type="button"
        disabled={issueCount === 0}
        onClick={() => onFilterChange("issues")}
        className={`rounded-full border px-3 py-1 text-[11.8px] font-semibold disabled:opacity-40 ${
          filter === "issues"
            ? "border-amber-500 bg-amber-500 text-white"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {issueCount ? "⚠" : "✓"} Issues <b className="font-mono">{issueCount}</b>
      </button>

      <span className="ml-auto inline-flex gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-[2.5px]">
        {[1, 2].map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => onZoomChange(z)}
            className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] font-bold ${zoom === z ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            {z}×
          </button>
        ))}
      </span>
    </div>
  );
};

export default PreviewFilterBar;

import DesignFilterCombobox from "./DesignFilterCombobox.jsx";

const TYPES = [
    { value: "", label: "All tag types" },
    { value: "SET", label: "Parent set" },
    { value: "BUNDLE", label: "Semi set" },
    { value: "PIECE", label: "Child piece" },
    { value: "LOOSE_PIECE", label: "Loose piece" },
];

const DATE_RANGES = [
    { value: "", label: "Any date" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
];

export default function FilterBar({ designs, filters, onChange, onClear, resultCount, showCount, searchKeyword }) {
    const selectedDesign = designs.find((d) => String(d.id) === String(filters.designId));
    const variants = selectedDesign?.colorVariants ?? [];

    return (
        <div className="qrc2-filters">
            <span className="qrc2-fcombo">
                <DesignFilterCombobox
                    designs={designs}
                    value={filters.designId}
                    onChange={(designId) => onChange({ ...filters, designId, colorVariantId: "" })}
                    keywordHint={searchKeyword}
                />
            </span>
            <span className="qrc2-fsel">
                <select value={filters.colorVariantId} onChange={(e) => onChange({ ...filters, colorVariantId: e.target.value })} disabled={!selectedDesign}>
                    <option value="">All variants</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.colorName}</option>)}
                </select>
            </span>
            <span className="qrc2-fsel">
                <select value={filters.type} onChange={(e) => onChange({ ...filters, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
            </span>
            <span className="qrc2-fsel">
                <select value={filters.days} onChange={(e) => onChange({ ...filters, days: e.target.value })}>
                    {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
            </span>
            <button className="qrc2-fclear" onClick={onClear}>Clear filters</button>
            {showCount && <span className="qrc2-rcount">{resultCount} {resultCount === 1 ? "match" : "matches"}</span>}
        </div>
    );
}

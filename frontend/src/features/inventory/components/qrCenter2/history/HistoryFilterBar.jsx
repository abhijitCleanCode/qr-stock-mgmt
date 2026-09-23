const STATUS_TABS = [
    { value: "all", label: "All" },
    { value: "pending", label: "Not printed" },
    { value: "partial", label: "Partially printed" },
    { value: "done", label: "Fully printed" },
];

export default function HistoryFilterBar({ designs, filters, onChange, onClear, statusFilter, onStatusChange, resultCount }) {
    const selectedDesign = designs.find((d) => String(d.id) === String(filters.designId));
    const variants = selectedDesign?.colorVariants ?? [];

    return (
        <>
            <div className="qrc2-filters">
                <span className="qrc2-fsel">
                    <select value={filters.designId} onChange={(e) => onChange({ ...filters, designId: e.target.value, colorVariantId: "" })}>
                        <option value="">All designs</option>
                        {designs.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
                    </select>
                </span>
                <span className="qrc2-fsel">
                    <select value={filters.colorVariantId} onChange={(e) => onChange({ ...filters, colorVariantId: e.target.value })} disabled={!selectedDesign}>
                        <option value="">All variants</option>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.colorName}</option>)}
                    </select>
                </span>
                <span className="qrc2-fsel">
                    <select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
                        <option value="new">Newest first</option>
                        <option value="old">Oldest first</option>
                    </select>
                </span>
                <button className="qrc2-fclear" onClick={onClear}>Clear filters</button>
                <span className="qrc2-rcount">{resultCount} {resultCount === 1 ? "batch" : "batches"}</span>
            </div>
            <div className="qrc2-seg" style={{ marginTop: 13 }}>
                {STATUS_TABS.map((t) => (
                    <button key={t.value} type="button" className={statusFilter === t.value ? "qrc2-on" : ""} onClick={() => onStatusChange(t.value)}>{t.label}</button>
                ))}
            </div>
        </>
    );
}

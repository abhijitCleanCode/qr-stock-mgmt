import { KindBadge } from "../shared/pills.jsx";
import QrCodeImage from "../../qr-center/QrCodeImage.jsx";

export default function ResultList({ tags, onSelect, loading, hasQuery }) {
    if (!hasQuery) {
        return (
            <div className="qrc2-rlist">
                <div className="qrc2-empty">
                    <b>Search or filter to begin</b>
                    Type a set ID, a design code, or a challan number. Scan straight into the box with a handheld reader.
                </div>
            </div>
        );
    }
    if (loading) {
        return <div className="qrc2-rlist"><div className="qrc2-empty">Searching…</div></div>;
    }
    if (!tags.length) {
        return (
            <div className="qrc2-rlist">
                <div className="qrc2-empty">
                    <b>No tag matches</b>
                    Check the code, or widen the filters.
                </div>
            </div>
        );
    }
    return (
        <div className="qrc2-rlist">
            {tags.map((t) => (
                <button key={t.shortCode} className="qrc2-rrow" onClick={() => onSelect(t.shortCode)}>
                    <span className="qrc2-mini"><QrCodeImage value={t.shortCode} size={34} /></span>
                    <span className="qrc2-info">
                        <span className="qrc2-c">{t.shortCode}</span>
                        <span className="qrc2-d">
                            {t.design.code} · {t.design.name} · {t.variant.colorName}
                            {t.sizeLabel ? ` · size ${t.sizeLabel}` : ""}
                            {t.rack ? ` · rack ${t.rack.code}` : ""}
                        </span>
                    </span>
                    <KindBadge kind={t.type} />
                </button>
            ))}
        </div>
    );
}

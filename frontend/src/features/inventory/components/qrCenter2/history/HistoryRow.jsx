import { Pill } from "../shared/pills.jsx";

const PILL_TONE = { done: "ok", partial: "part", pending: "warn" };

export default function HistoryRow({ row, onConfigure, onView }) {
    const tone = PILL_TONE[row.printStatus] ?? "neu";
    const label = row.printStatus === "partial"
        ? `${row.printedCount} of ${row.totalCount}`
        : row.printStatus === "done"
            ? `${row.printedCount} printed`
            : "Not printed";

    return (
        <div className={`qrc2-hrow${row.printStatus !== "done" ? " qrc2-alert" : ""}`}>
            <div>
                <div className="qrc2-b1">{row.challanNo ?? `#${row.registrationId}`}</div>
                <div className="qrc2-b2">{row.displayDate ? new Date(row.displayDate).toLocaleDateString() : ""}</div>
            </div>
            <div>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: row.variant.colorHex, marginRight: 6, verticalAlign: "middle" }} />
                <b style={{ color: "var(--qrc2-ink)" }}>{row.design.code}</b> {row.variant.colorName}
                <div className="qrc2-b2">{row.design.name}</div>
            </div>
            <div className="qrc2-num">{row.typeCounts.SET} <span>sets</span></div>
            <div className="qrc2-num">{row.totalCount} <span>tags</span></div>
            <div><Pill tone={tone}>{label}</Pill></div>
            <div className="qrc2-hact">
                {row.printStatus === "done"
                    ? <button className="qrc2-btn qrc2-sm" onClick={() => onView(row)}>View tags</button>
                    : <button className="qrc2-btn qrc2-sm qrc2-dark" onClick={() => onConfigure(row)}>Configure &amp; print</button>}
            </div>
        </div>
    );
}

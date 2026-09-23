import TagPreviewLabel from "../shared/TagPreviewLabel.jsx";
import { KindBadge } from "../shared/pills.jsx";

function DetailHead({ code, kind, onBack }) {
    return (
        <div className="qrc2-dhd">
            <span className="qrc2-code">{code} {kind && <KindBadge kind={kind} />}</span>
            <button className="qrc2-back" onClick={() => onBack(null)}>Back to results</button>
        </div>
    );
}

function Field({ k, v, sm }) {
    return <div className="qrc2-f"><div className="qrc2-k">{k}</div><div className={`qrc2-v${sm ? " qrc2-sm" : ""}`}>{v}</div></div>;
}

export default function TagDetail({ result, onBack, onRaiseReprint }) {
    if (!result) return <div className="qrc2-rlist"><div className="qrc2-empty">Loading…</div></div>;

    if (result.state === "SET") {
        const s = result.set;
        return (
            <div className="qrc2-detail">
                <DetailHead code={s.shortCode} kind="SET" onBack={onBack} />
                <div className="qrc2-dbd">
                    <TagPreviewLabel shortCode={s.shortCode} kind="SET" designCode={s.design.code} designName={s.design.name} colorName={s.variant.colorName} mrp={s.mrp} inwardDate={s.inwardDate} />
                    <div>
                        <div className="qrc2-dtitle">{s.design.code} · {s.variant.colorName}</div>
                        <div className="qrc2-dmeta">{s.pieceCount}-piece set ({s.sizeLabels?.join(" · ")}){s.rack ? ` · rack ${s.rack.code}` : ""}</div>
                        <div className="qrc2-grid">
                            <Field k="Set MRP" v={s.mrp != null ? `₹ ${s.mrp}` : "—"} />
                            <Field k="Inward batch" v={s.inwardBatch ?? "—"} sm />
                            <Field k="Inward date" v={s.inwardDate ?? "—"} sm />
                            <Field k="Times printed" v={`${s.timesPrinted ?? 0} ×`} />
                            <Field k="Last printed" v={s.lastPrintedAt ? new Date(s.lastPrintedAt).toLocaleString() : "—"} sm />
                            <Field k="Sealed" v={`${s.sealedDays} d ago`} />
                        </div>
                    </div>
                </div>
                <div className="qrc2-dact">
                    <button className="qrc2-btn qrc2-pri" onClick={() => onRaiseReprint([{ stockItemId: s.stockItemId, shortCode: s.shortCode, kind: "SET", designCode: s.design.code, designName: s.design.name, colorName: s.variant.colorName }])}>Reprint this tag</button>
                </div>
            </div>
        );
    }

    if (result.state === "PIECE") {
        const p = result.piece;
        return (
            <div className="qrc2-detail">
                <DetailHead code={p.shortCode} kind="PIECE" onBack={onBack} />
                <div className="qrc2-dbd">
                    <TagPreviewLabel shortCode={p.shortCode} kind="PIECE" designCode={p.design.code} designName={p.design.name} colorName={p.variant.colorName} sizeLabel={p.sizeLabel} parentShortCode={p.parent?.shortCode} inwardDate={p.inwardDate} />
                    <div>
                        <div className="qrc2-dtitle">{p.design.code} · {p.variant.colorName}</div>
                        <div className="qrc2-dmeta">Child piece · size {p.sizeLabel ?? "—"}{p.bin ? ` · bin ${p.bin.code}` : ""}</div>
                        <div className="qrc2-grid">
                            <Field k="Inward batch" v={p.inwardBatch ?? "—"} sm />
                            <Field k="Inward date" v={p.inwardDate ?? "—"} sm />
                            <Field k="Times printed" v={`${p.timesPrinted ?? 0} ×`} />
                            <Field k="Last printed" v={p.lastPrintedAt ? new Date(p.lastPrintedAt).toLocaleString() : "—"} sm />
                            <Field k="Origin" v={p.origin === "SET_BREAK" ? "From a broken set" : "Loose received"} sm />
                            <Field k="Parent set" v={p.parent?.shortCode ?? "—"} sm />
                        </div>
                    </div>
                </div>
                <div className="qrc2-dact">
                    <button className="qrc2-btn qrc2-pri" onClick={() => onRaiseReprint([{ stockItemId: p.stockItemId, shortCode: p.shortCode, kind: "PIECE", designCode: p.design.code, designName: p.design.name, colorName: p.variant.colorName, sizeLabel: p.sizeLabel }])}>Reprint this tag</button>
                    {p.parent?.shortCode && <button className="qrc2-btn" onClick={() => onBack(p.parent.shortCode)}>View parent set</button>}
                </div>
            </div>
        );
    }

    if (result.state === "RETIRED") {
        const r = result.retired;
        return (
            <div className="qrc2-detail qrc2-gone">
                <DetailHead code={r.shortCode} kind="RETIRED" onBack={onBack} />
                <div className="qrc2-note qrc2-info">
                    <b>Retired {r.retiredAt ? new Date(r.retiredAt).toLocaleString() : ""}{r.retiredReason ? ` — ${r.retiredReason}` : " — no reason recorded"}.</b> Its pieces carry their own tags now.
                </div>
                {r.successors?.length > 0 && (
                    <div className="qrc2-children">
                        {r.successors.map((succ) => (
                            <button key={succ.shortCode} className="qrc2-crow" onClick={() => onBack(succ.shortCode)}>
                                <span className="qrc2-cc">{succ.shortCode}</span>
                                <span className="qrc2-st">{succ.sizeLabel ?? ""}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (result.state === "DUPLICATE") {
        const d = result.duplicate;
        return (
            <div className="qrc2-detail">
                <DetailHead code={d.shortCode} kind="DUPLICATE" onBack={onBack} />
                <div className="qrc2-note qrc2-info">
                    <b>{d.events.length} active stock items currently share this code.</b> This needs manual reconciliation before either can be trusted at the till.
                </div>
                <div className="qrc2-children">
                    {d.events.map((ev, i) => (
                        <div key={`${ev.stockItemId}-${i}`} className="qrc2-crow">
                            <span className="qrc2-cc">stock item #{ev.stockItemId}</span>
                            <span className="qrc2-st">{ev.printerName ?? "—"} · {ev.printedAt ? new Date(ev.printedAt).toLocaleString() : "never printed"}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (result.state === "RACK") {
        const r = result.rack;
        return (
            <div className="qrc2-detail">
                <DetailHead code={r.code} onBack={onBack} />
                <div className="qrc2-dbd" style={{ gridTemplateColumns: "1fr" }}>
                    <div>
                        <div className="qrc2-dtitle">Rack {r.code}</div>
                        <div className="qrc2-grid">
                            <Field k="Expected sets" v={r.expectedSets} />
                            <Field k="Scanned sets" v={r.scannedSets} />
                            <Field k="Missing" v={r.missing} />
                        </div>
                        {r.breakdown?.length > 0 && (
                            <div className="qrc2-children" style={{ marginTop: 16 }}>
                                {r.breakdown.map((b, i) => (
                                    <div key={i} className="qrc2-crow">
                                        <span className="qrc2-cc">{b.designCode} · {b.colorName}</span>
                                        <span className="qrc2-st">{b.sets} sets</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // UNKNOWN
    return (
        <div className="qrc2-rlist">
            <div className="qrc2-empty">
                <b>Unrecognized code</b>
                <span className="qrc2-mono">{result.code}</span> doesn't match any tag on file.
            </div>
        </div>
    );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Drawer from "./Drawer.jsx";
import TagPreviewLabel from "../shared/TagPreviewLabel.jsx";
import { createQrCenterReprintApi, bulkPrintReprintsApi, getQrCenterReferenceApi, printCheckApi } from "../../../services/qrCenter.api.js";

const REASONS = ["LOST", "TORN", "FADED", "REBAG", "JAM", "PRICE_CHANGE"];

export default function ReprintDrawer({ open, onClose, targets, onDone }) {
    const [reason, setReason] = useState("REBAG");
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const resetAndClose = () => {
        setReason("REBAG");
        setConfirmed(false);
        onClose();
    };

    const { data: referenceResponse } = useQuery({
        queryKey: ["qr-center", "reference"],
        queryFn: getQrCenterReferenceApi,
        enabled: open,
    });
    const printers = referenceResponse?.data?.printers ?? [];
    const defaultPrinter = printers.find((p) => p.isActive) ?? printers[0];

    const n = targets?.length ?? 0;

    const handlePrint = async () => {
        if (!defaultPrinter || !targets?.length) return;
        setSubmitting(true);
        try {
            const stockItemQrIds = targets.map((t) => t.stockItemQrId).filter(Boolean);
            if (stockItemQrIds.length) {
                const check = await printCheckApi({ stockItemQrIds });
                const recentCount = check?.data?.matchedCount ?? 0;
                if (recentCount > 0 && !window.confirm(`${recentCount} of these were printed in the last few minutes. Print again?`)) {
                    setSubmitting(false);
                    return;
                }
            }

            const reprintRequestIds = [];
            for (const t of targets) {
                const created = await createQrCenterReprintApi({ stockItemId: t.stockItemId, reasonCode: reason, raisedBy: "zelero.tech@gmail.com" });
                if (created?.data?.id) reprintRequestIds.push(created.data.id);
            }
            if (reprintRequestIds.length) {
                await bulkPrintReprintsApi({ reprintRequestIds, printerId: defaultPrinter.id });
            }
            await queryClient.invalidateQueries({ queryKey: ["qr-center"] });
            onDone?.();
            resetAndClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={resetAndClose}
            title={`Reprint ${n} tag${n === 1 ? "" : "s"}`}
            subtitle="Exact duplicate — nothing here can change what prints"
            footer={
                <>
                    <span className="qrc2-left"><b>{n}</b> tag{n === 1 ? "" : "s"}</span>
                    <button className="qrc2-btn" onClick={resetAndClose}>Cancel</button>
                    <button className="qrc2-btn qrc2-pri" disabled={!confirmed || submitting || !defaultPrinter || n === 0} onClick={handlePrint}>
                        {submitting ? "Printing…" : `Print ${n} replacement${n === 1 ? "" : "s"}`}
                    </button>
                </>
            }
        >
            <div className="qrc2-lockcode">
                <div className="qrc2-k">Reprinting — payload locked, codes never change</div>
                <div className="qrc2-v">{n} tag{n === 1 ? "" : "s"} selected</div>
            </div>

            {!defaultPrinter && (
                <div className="qrc2-note qrc2-info" style={{ marginBottom: 16 }}>
                    No active printer is configured — add one before printing.
                </div>
            )}

            <div className="qrc2-fg">
                <label>Reason — required</label>
                <div className="qrc2-reasons">
                    {REASONS.map((r) => (
                        <button key={r} type="button" className={`qrc2-rbtn${reason === r ? " qrc2-on" : ""}`} onClick={() => setReason(r)}>{r}</button>
                    ))}
                </div>
            </div>

            <div className="qrc2-fg">
                <label>Preview</label>
                <div className="qrc2-rollstack">
                    {(targets ?? []).map((t) => (
                        <TagPreviewLabel key={t.shortCode} shortCode={t.shortCode} kind={t.kind} designCode={t.designCode} designName={t.designName} colorName={t.colorName} sizeLabel={t.sizeLabel} />
                    ))}
                </div>
            </div>

            <label className="qrc2-chk">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span className="qrc2-t"><b>Every old label above has been physically destroyed or removed.</b> Reprinting without destroying the original leaves two labels answering to the same code — stock gets counted twice and one id never sells.</span>
            </label>
        </Drawer>
    );
}

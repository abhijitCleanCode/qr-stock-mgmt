import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Drawer from "./Drawer.jsx";
import { useQrCenterBatchQueueApi } from "../../../hooks/useQrCenterBatchQueueApi.js";
import { printBatchQueueApi } from "../../../services/qrCenterSearch.api.js";
import { getQrCenterReferenceApi } from "../../../services/qrCenter.api.js";

export default function ConfigureBatchDrawer({ open, onClose, stockInTransactionId, onDone }) {
    const { data: response, isLoading } = useQrCenterBatchQueueApi(stockInTransactionId, { enabled: open });
    const [submitting, setSubmitting] = useState(false);
    const queue = response?.data;
    const queryClient = useQueryClient();

    const { data: referenceResponse } = useQuery({
        queryKey: ["qr-center", "reference"],
        queryFn: getQrCenterReferenceApi,
        enabled: open,
    });
    const printers = referenceResponse?.data?.printers ?? [];
    const defaultPrinter = printers.find((p) => p.isActive) ?? printers[0];

    const printable = (queue?.unprintedCount ?? 0) + (queue?.missingQrCount ?? 0);

    const handlePrint = async () => {
        if (!printable) return;
        setSubmitting(true);
        try {
            await printBatchQueueApi(stockInTransactionId, { printerId: defaultPrinter?.id });
            await queryClient.invalidateQueries({ queryKey: ["qr-center"] });
            await queryClient.invalidateQueries({ queryKey: ["qr-center-batch-queue", stockInTransactionId] });
            onDone?.();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Configure & print tags"
            subtitle={queue ? `${queue.registration.challanNo ?? `#${queue.registration.stockInTransactionId}`} · ${queue.registration.stockDate ?? ""}` : ""}
            footer={
                <>
                    <span className="qrc2-left"><b>{printable}</b> tag{printable === 1 ? "" : "s"} to print</span>
                    <button className="qrc2-btn" onClick={onClose}>Cancel</button>
                    <button className="qrc2-btn qrc2-pri" disabled={isLoading || submitting || printable === 0} onClick={handlePrint}>
                        {submitting ? "Printing…" : "Print tags"}
                    </button>
                </>
            }
        >
            <div className="qrc2-callout qrc2-warn">
                <b>Tags for this batch were skipped at stock-in.</b> The stock is already registered against inventory — printing now only produces the missing labels. Codes were issued when the batch was saved, so every tag below carries the id it has always had.
            </div>

            {isLoading && <div className="qrc2-empty">Loading…</div>}

            {queue && (
                <div className="qrc2-fg">
                    <label>Generation queue</label>
                    <div className="qrc2-qt">
                        <table>
                            <thead><tr><th>Design</th><th>Already coded, unprinted</th><th>No code yet</th><th>Loose (informational)</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>{queue.registration.design.code} · {queue.registration.variant.colorName}</td>
                                    <td>{queue.unprintedCount}</td>
                                    <td>{queue.missingQrCount}</td>
                                    <td>{queue.untaggedLooseCount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {queue.untaggedLooseCount > 0 && (
                        <div style={{ marginTop: 8, fontSize: "12.3px", color: "var(--qrc2-mut)" }}>
                            Loose pieces are pooled stock and aren't individually tagged from this drawer — tag them at Stock-In or via a Break Set flow instead.
                        </div>
                    )}
                </div>
            )}

            {!defaultPrinter && (
                <div className="qrc2-note qrc2-info" style={{ marginTop: 16 }}>
                    No active printer is configured — the print job will be recorded without one.
                </div>
            )}
        </Drawer>
    );
}

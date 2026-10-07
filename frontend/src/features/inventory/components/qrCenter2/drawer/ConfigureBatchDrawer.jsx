import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Drawer, { DrawerSummary } from "./Drawer.jsx";
import { ActionButton, EmptyState, InfoNote, SectionLabel } from "../shared/primitives.jsx";
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
                    <DrawerSummary count={printable}>tag{printable === 1 ? "" : "s"} to print</DrawerSummary>
                    <ActionButton onClick={onClose}>Cancel</ActionButton>
                    <ActionButton variant="primary" disabled={isLoading || submitting || printable === 0} onClick={handlePrint}>
                        {submitting ? "Printing…" : "Print tags"}
                    </ActionButton>
                </>
            }
        >
            <div className="mb-5 rounded-[11px] border border-amber-200 bg-amber-50 px-4 py-[13px] text-[13px] leading-relaxed text-amber-800">
                <b>Tags for this batch were skipped at stock-in.</b> The stock is already registered against inventory — printing now only produces the missing labels. Codes were issued when the batch was saved, so every tag below carries the id it has always had.
            </div>

            {isLoading && <EmptyState>Loading…</EmptyState>}

            {queue && (
                <div className="mb-[22px]">
                    <SectionLabel>Generation queue</SectionLabel>
                    <div className="overflow-x-auto rounded-[11px] border border-slate-200">
                        <table className="w-full border-collapse text-[12.3px]">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-right text-[9.5px] font-bold uppercase tracking-[.07em] text-slate-400 *:px-2.5 *:py-2 sm:*:whitespace-nowrap">
                                    <th className="text-left">Design</th><th>Already coded, unprinted</th><th>No code yet</th><th>Loose (informational)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-right font-mono tabular-nums text-slate-700 *:px-2.5 *:py-[11px]">
                                    <td className="text-left font-sans font-semibold text-slate-900">{queue.registration.design.code} · {queue.registration.variant.colorName}</td>
                                    <td>{queue.unprintedCount}</td>
                                    <td>{queue.missingQrCount}</td>
                                    <td>{queue.untaggedLooseCount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {queue.untaggedLooseCount > 0 && (
                        <div className="mt-2 text-[12.3px] text-slate-500">
                            Loose pieces are pooled stock and aren't individually tagged from this drawer — tag them at Stock-In or via a Break Set flow instead.
                        </div>
                    )}
                </div>
            )}

            {!defaultPrinter && (
                <InfoNote className="mt-4">No active printer is configured — the print job will be recorded without one.</InfoNote>
            )}
        </Drawer>
    );
}

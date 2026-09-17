import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useQrCenterReprintsApi, useBulkPrintReprintsApi } from "../../../hooks/useQrCenterReprintsApi";
import { useQrCenterReferenceApi } from "../../../hooks/useQrCenterReferenceApi";
import { PrimaryButton, Th, VariantDot, Pill } from "../ui/qrcUi";
import { reasonLabel, reasonStyle } from "../../../utils/qrCenterConstants";

export default function ReprintsTab({ guards }) {
    const { data: response, isPending, isError, error } = useQrCenterReprintsApi({ status: "PENDING", limit: 50 });
    const { data: referenceResponse } = useQrCenterReferenceApi();
    const bulkPrint = useBulkPrintReprintsApi();
    const rows = response?.data ?? [];
    const printers = referenceResponse?.data?.printers ?? [];
    const defaultPrinter = printers.find((p) => p.isActive) ?? printers[0];

    const [selected, setSelected] = useState(new Set());

    const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

    const toggleAll = () => {
        setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
    };

    const toggleOne = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);

    const doPrint = async () => {
        if (!defaultPrinter) {
            toast.error("No printer is configured yet — add one before printing.");
            return;
        }
        try {
            const res = await bulkPrint.mutateAsync({ reprintRequestIds: [...selected], printerId: defaultPrinter.id });
            toast.success(`Reprint batch queued — ${res?.data?.reprintedCount ?? selected.size} codes.`);
            setSelected(new Set());
        } catch (err) {
            toast.error(err?.message ?? "Couldn't print the batch.");
        }
    };

    const handlePrintBatch = () => {
        guards.guardDuplicate({
            stockItemQrIds: selectedRows.map((r) => r.stockItemQrId).filter(Boolean),
            label: `Reprint batch (${selected.size} codes)`,
            onConfirm: doPrint,
        });
    };

    if (isPending) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Loading reprint requests…</div>;
    if (isError) return <div className="text-[13px] text-[var(--qrc-danger)] px-1 py-6 text-center">{error?.message ?? "Couldn't load reprints."}</div>;
    if (rows.length === 0) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">No reprint requests pending.</div>;

    return (
        <div>
            <div className="qrc-scrollx">
                <table className="w-full min-w-[820px] text-[13px]">
                    <thead>
                        <tr className="bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)]">
                            <th className="w-10 px-3 py-2">
                                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-[#10B981]" />
                            </th>
                            <Th>Item code</Th>
                            <Th>Design / Variant</Th>
                            <Th>Reason</Th>
                            <Th>Raised by</Th>
                            <Th>Rack</Th>
                            <Th right>Age</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className={`border-b border-[var(--qrc-line)] last:border-0 ${selected.has(r.id) ? "bg-[var(--qrc-accent-bg)]/40" : ""}`}>
                                <td className="px-3 py-2.5">
                                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="w-4 h-4 accent-[#10B981]" />
                                </td>
                                <td className="px-3 py-2.5 qrc-mono font-semibold text-[var(--qrc-ink)]">{r.shortCode}</td>
                                <td className="px-3 py-2.5">
                                    <span className="flex items-center gap-1.5">
                                        <VariantDot color={r.variant?.colorHex} /> {r.design?.code} · {r.variant?.colorName}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5">
                                    <Pill className={reasonStyle(r.reasonCode)}>{reasonLabel(r.reasonCode)}</Pill>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--qrc-ink2)]">{r.raisedBy}</td>
                                <td className="px-3 py-2.5 qrc-mono text-[var(--qrc-ink3)]">{r.rack?.code ?? "—"}</td>
                                <td className="px-3 py-2.5 text-right qrc-mono text-[var(--qrc-ink2)]">{r.ageDays}d</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selected.size > 0 && (
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="text-[13px] text-[var(--qrc-ink2)]">
                        <b className="text-[var(--qrc-ink)] qrc-mono">{selected.size}</b> selected — printed tags list which rack each returns to.
                    </div>
                    <PrimaryButton disabled={bulkPrint.isPending} onClick={handlePrintBatch}>
                        Print batch
                    </PrimaryButton>
                </div>
            )}
        </div>
    );
}

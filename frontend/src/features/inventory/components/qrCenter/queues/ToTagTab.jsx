import { useState } from "react";
import { Link } from "react-router";
import { useQrCenterToTagApi } from "../../../hooks/useQrCenterToTagApi";
import { PrimaryButton, Th, VariantDot } from "../ui/qrcUi";

export default function ToTagTab() {
    const [page, setPage] = useState(1);
    const { data: response, isPending, isError, error } = useQrCenterToTagApi({ page, limit: 20 });
    const rows = response?.data ?? [];
    const meta = response?.meta;

    if (isPending) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Loading untagged stock…</div>;
    if (isError) return <div className="text-[13px] text-[var(--qrc-danger)] px-1 py-6 text-center">{error?.message ?? "Couldn't load the to-tag queue."}</div>;
    if (rows.length === 0) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Nothing waiting to be tagged. Every batch has an active QR.</div>;

    return (
        <div>
            <div className="qrc-scrollx">
                <table className="w-full min-w-[720px] text-[13px]">
                    <thead>
                        <tr className="bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)]">
                            <Th>Source</Th>
                            <Th>Design / Variant</Th>
                            <Th right>Sets</Th>
                            <Th right>Loose</Th>
                            <Th right>Age</Th>
                            <Th>Location</Th>
                            <Th>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={`${row.source}-${idx}`} className="border-b border-[var(--qrc-line)] last:border-0">
                                <td className="px-3 py-2.5">
                                    <div className="font-semibold text-[var(--qrc-ink)]">{row.source}</div>
                                    <div className="text-[11px] text-[var(--qrc-ink3)]">{row.note}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                    {row.variant?.colorHex ? (
                                        <span className="flex items-center gap-1.5">
                                            <VariantDot color={row.variant.colorHex} /> {row.design?.code} · {row.variant?.colorName}
                                        </span>
                                    ) : (
                                        <span className="text-[var(--qrc-ink3)]">{row.design?.code ?? "Mixed"}</span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-right qrc-mono">{row.sets}</td>
                                <td className="px-3 py-2.5 text-right qrc-mono">{row.loose}</td>
                                <td className={`px-3 py-2.5 text-right qrc-mono ${row.ageDays > 7 ? "text-[var(--qrc-warn)] bg-[var(--qrc-warn-bg)] rounded" : "text-[var(--qrc-ink2)]"}`}>{row.ageDays}d</td>
                                <td className="px-3 py-2.5 qrc-mono text-[var(--qrc-ink3)]">{row.location ?? "—"}</td>
                                <td className="px-3 py-2.5">
                                    {row.stockInTransactionId ? (
                                        <Link to={`/qr-center/${row.stockInTransactionId}`}>
                                            <PrimaryButton>Open in QR Grid</PrimaryButton>
                                        </Link>
                                    ) : (
                                        <span className="text-[var(--qrc-ink4)] text-[12px]">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {meta && meta.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--qrc-ink3)]">
                    <span>
                        Page {meta.page} of {meta.totalPages} · {meta.total} batches
                    </span>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 rounded-md border border-[var(--qrc-line-strong)] disabled:opacity-40">
                            Prev
                        </button>
                        <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} className="px-2.5 py-1 rounded-md border border-[var(--qrc-line-strong)] disabled:opacity-40">
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

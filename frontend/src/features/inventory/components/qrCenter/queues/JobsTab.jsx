import { useState } from "react";
import { toast } from "react-toastify";
import { useQrCenterJobsApi, useReprintJobRangeApi, useVerifyJobSampleApi } from "../../../hooks/useQrCenterJobsApi";
import { PrimaryButton, SecondaryButton, Th, Pill } from "../ui/qrcUi";
import { jobStatusMeta, minutesAgo } from "../../../utils/qrCenterConstants";

export default function JobsTab({ guards }) {
    const { data: response, isPending, isError, error } = useQrCenterJobsApi({ limit: 30 });
    const reprintRange = useReprintJobRangeApi();
    const verifySample = useVerifyJobSampleApi();
    const [verifiedFlash, setVerifiedFlash] = useState({});
    const rows = response?.data ?? [];

    const doReprintRange = async (row) => {
        const from = (row.jammedAtCount ?? 0) + 1;
        const to = row.totalCount;
        try {
            await reprintRange.mutateAsync({ id: row.id, fromSeq: from, toSeq: to });
            toast.success(`Reprint queued for codes ${from}–${to}.`);
        } catch (err) {
            toast.error(err?.message ?? "Couldn't reprint that range.");
        }
    };

    const handleReprintRange = (row) => {
        const count = row.totalCount - (row.jammedAtCount ?? 0);
        guards.guardVolume({ count, onConfirm: () => doReprintRange(row) });
    };

    const handleVerify = async (row) => {
        try {
            await verifySample.mutateAsync({ id: row.id });
            setVerifiedFlash((prev) => ({ ...prev, [row.id]: true }));
            toast.success("Sample verified.");
        } catch (err) {
            toast.error(err?.message ?? "Couldn't verify sample.");
        }
    };

    if (isPending) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Loading print jobs…</div>;
    if (isError) return <div className="text-[13px] text-[var(--qrc-danger)] px-1 py-6 text-center">{error?.message ?? "Couldn't load jobs."}</div>;
    if (rows.length === 0) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">No print jobs yet.</div>;

    return (
        <div className="qrc-scrollx">
            <table className="w-full min-w-[820px] text-[13px]">
                <thead>
                    <tr className="bg-[var(--qrc-sunken)] border-b border-[var(--qrc-line)]">
                        <Th>Job ID</Th>
                        <Th>Type</Th>
                        <Th>Printer</Th>
                        <Th>Codes</Th>
                        <Th>Status</Th>
                        <Th>Time</Th>
                        <Th>Action</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const meta = jobStatusMeta(row.status);
                        return (
                            <tr key={row.id} className="border-b border-[var(--qrc-line)] last:border-0">
                                <td className="px-3 py-2.5 qrc-mono font-semibold text-[var(--qrc-ink)]">#{row.id}</td>
                                <td className="px-3 py-2.5 text-[var(--qrc-ink2)]">{row.jobType?.replace(/_/g, " ")}</td>
                                <td className="px-3 py-2.5 text-[var(--qrc-ink3)]">{row.printer?.name ?? "—"}</td>
                                <td className="px-3 py-2.5 qrc-mono text-[var(--qrc-ink2)]">
                                    {row.status === "JAMMED" && row.jammedAtCount != null ? `${row.jammedAtCount} of ${row.totalCount} codes` : `${row.totalCount} codes`}
                                </td>
                                <td className="px-3 py-2.5">
                                    <Pill className={meta.cls}>{row.status === "JAMMED" && row.jammedAtCount != null ? `Jammed at ${row.jammedAtCount} of ${row.totalCount}` : meta.label}</Pill>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--qrc-ink3)]">{minutesAgo(row.createdAt)}</td>
                                <td className="px-3 py-2.5">
                                    {row.status === "JAMMED" && (
                                        <PrimaryButton disabled={reprintRange.isPending} onClick={() => handleReprintRange(row)}>
                                            Reprint range {(row.jammedAtCount ?? 0) + 1}–{row.totalCount}
                                        </PrimaryButton>
                                    )}
                                    {row.status === "COMPLETED_UNVERIFIED" &&
                                        (verifiedFlash[row.id] ? (
                                            <span className="text-[12px] text-[var(--qrc-accent-hover)] font-semibold">Verified ✓</span>
                                        ) : (
                                            <SecondaryButton disabled={verifySample.isPending} onClick={() => handleVerify(row)}>
                                                Verify sample
                                            </SecondaryButton>
                                        ))}
                                    {row.status !== "JAMMED" && row.status !== "COMPLETED_UNVERIFIED" && <span className="text-[var(--qrc-ink4)] text-[12px]">—</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

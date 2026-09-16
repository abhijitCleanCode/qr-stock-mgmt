import { useQrCenterJobsApi } from "../../hooks/useQrCenterJobsApi";

export default function OfflineQueuePill() {
    const { data: response } = useQrCenterJobsApi({ status: "QUEUED_OFFLINE", limit: 50 });
    const count = response?.data?.length ?? 0;

    if (!count) return null;

    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--qrc-warn-bg)] border border-[var(--qrc-warn-border)] text-[var(--qrc-warn)] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--qrc-warn)]" />
            {count} print job{count === 1 ? "" : "s"} queued — offline
        </div>
    );
}

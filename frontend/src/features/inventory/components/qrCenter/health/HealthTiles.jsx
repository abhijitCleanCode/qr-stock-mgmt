import { useQrCenterHealthApi } from "../../../hooks/useQrCenterHealthApi";
import { Eyebrow } from "../ui/qrcUi";

export default function HealthTiles({ activeTab, onSelectTab, onShowDuplicate, duplicateShown }) {
    const { data: healthResponse, isPending, isError } = useQrCenterHealthApi();
    const h = healthResponse?.data;

    const tiles = [
        {
            id: "untagged",
            label: "Untagged stock",
            value: h ? `${h.untaggedBatches} batches` : "—",
            sub: h ? `${h.untaggedPieces} pcs` : "",
            state: "warn",
            tab: "totag",
        },
        {
            id: "reprints",
            label: "Reprints pending",
            value: h ? String(h.reprintsPending) : "—",
            sub: "requests",
            state: "warn",
            tab: "reprints",
        },
        {
            id: "stale",
            label: "Stale-price tags",
            value: h ? String(h.staleTagCount) : "—",
            sub: "labels",
            state: "warn",
            tab: "stale",
        },
        {
            id: "dup",
            label: "Duplicate suspects",
            value: h ? String(h.duplicateSuspectCount) : "—",
            sub: "code",
            state: "danger",
            tab: null,
        },
        {
            id: "unverified",
            label: "Unverified prints",
            value: h ? `${h.unverifiedPrintJobs} jobs` : "—",
            sub: "awaiting sample",
            state: "neutral",
            tab: "jobs",
        },
    ];

    const dotCls = { warn: "bg-[var(--qrc-warn)]", danger: "bg-[var(--qrc-danger)]", neutral: "bg-[var(--qrc-ink4)]" };

    if (isError) {
        return (
            <section className="mb-6">
                <div className="rounded-[10px] border border-[var(--qrc-danger-border)] bg-[var(--qrc-danger-bg)] px-4 py-3 text-[13px] text-[var(--qrc-danger)]">
                    Couldn't load QR health metrics.
                </div>
            </section>
        );
    }

    return (
        <section className="mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {tiles.map((t) => {
                    const active = (t.tab && activeTab === t.tab) || (t.id === "dup" && duplicateShown);
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => (t.id === "dup" ? onShowDuplicate() : t.tab && onSelectTab(t.tab))}
                            disabled={isPending}
                            className={`text-left bg-white border rounded-[10px] px-3.5 py-3 hover:border-[var(--qrc-line-strong)] transition-colors ${
                                active ? "border-[var(--qrc-accent)] ring-1 ring-[var(--qrc-accent)]" : "border-[var(--qrc-line)]"
                            } disabled:opacity-60`}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotCls[t.state]}`} />
                                <Eyebrow>{t.label}</Eyebrow>
                            </div>
                            <div className="qrc-mono text-[20px] font-bold text-[var(--qrc-ink)] leading-none">{t.value}</div>
                            <div className="text-[11px] text-[var(--qrc-ink3)] mt-1">{t.sub}</div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

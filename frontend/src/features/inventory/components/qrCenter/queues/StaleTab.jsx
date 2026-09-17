import { useState } from "react";
import { toast } from "react-toastify";
import { useQrCenterStaleApi, useReprintStaleApi, useAcceptStaleApi } from "../../../hooks/useQrCenterStaleApi";
import { PrimaryButton, SecondaryButton, Eyebrow } from "../ui/qrcUi";
import { fmtINR } from "../../../utils/qrCenterConstants";

export default function StaleTab({ guards }) {
    const { data: response, isPending, isError, error } = useQrCenterStaleApi();
    const reprintStale = useReprintStaleApi();
    const acceptStale = useAcceptStaleApi();
    const [flash, setFlash] = useState({});
    const groups = response?.data ?? [];

    const doReprint = async (group, scope) => {
        try {
            const res = await reprintStale.mutateAsync({ designId: group.designId, scope });
            toast.success(`Reprint queued — ${res?.data?.reprintedCount ?? "0"} tags for ${group.designCode}.`);
        } catch (err) {
            toast.error(err?.message ?? "Couldn't reprint stale tags.");
        }
    };

    const handleReprint = (group, scope, count) => {
        guards.guardVolume({
            count,
            media: undefined,
            onConfirm: () => doReprint(group, scope),
        });
    };

    const handleAccept = async (group) => {
        try {
            const res = await acceptStale.mutateAsync({ designId: group.designId });
            setFlash((prev) => ({ ...prev, [group.designId]: `Accepted — ${res?.data?.acceptedCount ?? group.staleCount} tags remain valid until next reprint.` }));
        } catch (err) {
            toast.error(err?.message ?? "Couldn't accept stale pricing.");
        }
    };

    if (isPending) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Loading stale-price tags…</div>;
    if (isError) return <div className="text-[13px] text-[var(--qrc-danger)] px-1 py-6 text-center">{error?.message ?? "Couldn't load stale tags."}</div>;
    if (groups.length === 0) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">No stale-price tags. Every active tag matches the current price list.</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {groups.map((g) => (
                <div key={g.designId} className="border border-[var(--qrc-warn-border)] bg-[var(--qrc-warn-bg)] rounded-[10px] p-4">
                    <Eyebrow className="text-[var(--qrc-warn)] mb-1">Price revised on {g.designCode}</Eyebrow>
                    <p className="text-[13px] text-[var(--qrc-ink2)] leading-relaxed mb-3">
                        {g.staleCount} printed tags are out of date · current price is {fmtINR(g.currentPrice)}.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <PrimaryButton disabled={reprintStale.isPending} onClick={() => handleReprint(g, "ALL", g.staleCount)}>
                            Reprint all ({g.staleCount})
                        </PrimaryButton>
                        <SecondaryButton disabled={reprintStale.isPending} onClick={() => handleReprint(g, "ON_HAND", g.onHandCount)}>
                            Reprint on hand ({g.onHandCount})
                        </SecondaryButton>
                        <SecondaryButton disabled={acceptStale.isPending} onClick={() => handleAccept(g)}>
                            Accept stale
                        </SecondaryButton>
                    </div>
                    {flash[g.designId] && <div className="mt-2.5 text-[12px] text-[var(--qrc-ink3)] qrc-fade-in">{flash[g.designId]}</div>}
                </div>
            ))}
        </div>
    );
}

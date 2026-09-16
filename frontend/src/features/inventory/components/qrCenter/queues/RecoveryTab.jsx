import { useState } from "react";
import { toast } from "react-toastify";
import { useQrCenterRecoveryApi, useAssignRecoveryIdentityApi } from "../../../hooks/useQrCenterRecoveryApi";
import { DangerButton, SecondaryButton, FieldLabel, NativeInput, Pill } from "../ui/qrcUi";
import DesignSearchInput from "../../DesignSearchInput";

export default function RecoveryTab() {
    const { data: response, isPending, isError, error } = useQrCenterRecoveryApi({ status: "PENDING" });
    const rows = response?.data ?? [];
    const [openId, setOpenId] = useState(null);
    const [doneIds, setDoneIds] = useState(new Set());

    if (isPending) return <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-6 text-center">Loading recovery queue…</div>;
    if (isError) return <div className="text-[13px] text-[var(--qrc-danger)] px-1 py-6 text-center">{error?.message ?? "Couldn't load the recovery queue."}</div>;

    return (
        <div className="border border-[var(--qrc-warn-border)] bg-[var(--qrc-warn-bg)] rounded-[10px] p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[15px]">🔒</span>
                <div className="qrc-eyebrow text-[var(--qrc-warn)]">Requires supervisor approval</div>
            </div>
            {rows.length === 0 ? (
                <div className="text-[13px] text-[var(--qrc-ink2)] bg-white border border-[var(--qrc-warn-border)] rounded-lg px-3.5 py-3">
                    No anonymous items awaiting identity assignment.
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map((r) => (
                        <div key={r.id} className="bg-white border border-[var(--qrc-warn-border)] rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-3.5 py-3 flex-wrap">
                                <div>
                                    <div className="font-semibold text-[var(--qrc-ink)] text-[13px]">{r.foundLocation}</div>
                                    <div className="text-[12px] text-[var(--qrc-ink3)] mt-0.5">
                                        {r.notes} · found {new Date(r.createdAt).toLocaleDateString("en-IN")}
                                    </div>
                                </div>
                                {doneIds.has(r.id) ? (
                                    <Pill className="text-[var(--qrc-accent-hover)] bg-[var(--qrc-accent-bg)] border-[var(--qrc-accent-border)]">Identity assigned</Pill>
                                ) : (
                                    <DangerButton onClick={() => setOpenId(openId === r.id ? null : r.id)}>Assign identity</DangerButton>
                                )}
                            </div>
                            {openId === r.id && !doneIds.has(r.id) && (
                                <AssignIdentityFlow
                                    entry={r}
                                    onCancel={() => setOpenId(null)}
                                    onDone={() => {
                                        setDoneIds((prev) => new Set(prev).add(r.id));
                                        setOpenId(null);
                                    }}
                                />
                            )}
                            {doneIds.has(r.id) && (
                                <div className="px-3.5 py-2.5 bg-[var(--qrc-danger-bg)] border-t border-[var(--qrc-danger-border)] text-[12px] text-[var(--qrc-danger)] font-semibold">
                                    Rack reconcile required after recovery.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AssignIdentityFlow({ entry, onCancel, onDone }) {
    const assignIdentity = useAssignRecoveryIdentityApi();
    const [variantPick, setVariantPick] = useState(null); // { designId, colorVariantId, designCode, colorName, colorHex }
    const [rackId, setRackId] = useState("");
    const [claimShortCode, setClaimShortCode] = useState("");
    const [supervisorName, setSupervisorName] = useState("");
    const [acknowledged, setAcknowledged] = useState(false);

    const canSubmit = variantPick && rackId && supervisorName.trim() && acknowledged;

    const handleSubmit = async () => {
        try {
            await assignIdentity.mutateAsync({
                id: entry.id,
                designId: variantPick.designId,
                colorVariantId: variantPick.colorVariantId,
                rackId: Number(rackId),
                supervisorName: supervisorName.trim(),
                acknowledged: true,
                claimShortCode: claimShortCode.trim() || undefined,
            });
            toast.success("Identity assigned and label printed.");
            onDone();
        } catch (err) {
            toast.error(err?.message ?? "Couldn't assign identity.");
        }
    };

    return (
        <div className="px-3.5 py-3.5 bg-[var(--qrc-sunken)] border-t border-[var(--qrc-warn-border)] qrc-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                <label className="block sm:col-span-2">
                    <FieldLabel>Design &amp; variant</FieldLabel>
                    <div className="mt-1">
                        <DesignSearchInput
                            placeholder="Search design to assign…"
                            onSelect={(selection) => setVariantPick(selection)}
                        />
                    </div>
                    {variantPick && (
                        <div className="mt-1 text-[12px] text-[var(--qrc-ink2)] flex items-center gap-1.5">
                            <span className="inline-block w-[9px] h-[9px] rounded-full" style={{ background: variantPick.colorHex }} />
                            {variantPick.designCode} · {variantPick.colorName}
                        </div>
                    )}
                </label>
                <label className="block">
                    <FieldLabel>Rack ID</FieldLabel>
                    <NativeInput className="mt-1" type="number" min="1" placeholder="e.g. 12" value={rackId} onChange={(e) => setRackId(e.target.value)} />
                </label>
                <label className="block">
                    <FieldLabel>Claim missing code (optional)</FieldLabel>
                    <NativeInput className="mt-1 qrc-mono" placeholder="e.g. SET-KP100-RED-031" value={claimShortCode} onChange={(e) => setClaimShortCode(e.target.value.toUpperCase())} />
                </label>
                <label className="block sm:col-span-2">
                    <FieldLabel>Supervisor name</FieldLabel>
                    <NativeInput className="mt-1" placeholder="Supervisor approving this recovery" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} />
                </label>
            </div>
            <label className="flex items-center gap-2 mb-3 text-[12px] text-[var(--qrc-ink2)]">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="w-4 h-4 accent-[#10B981]" />
                I acknowledge this creates a new stock identity for an unverified item.
            </label>
            <div className="flex items-center gap-2">
                <DangerButton disabled={!canSubmit || assignIdentity.isPending} onClick={handleSubmit}>
                    Print &amp; assign
                </DangerButton>
                <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
            </div>
        </div>
    );
}

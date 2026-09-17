import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { PrimaryButton, SecondaryButton, DangerButton, Eyebrow } from "../ui/qrcUi";

export default function DuplicatePrintGuardModal({ modal, onClose, onConfirm }) {
    if (!modal || modal.kind !== "duplicate") return null;
    const { matchedCount, firstMatch, label } = modal;
    const printedAt = firstMatch?.printedAt ? new Date(firstMatch.printedAt) : null;
    const minsAgo = printedAt ? Math.max(0, Math.round((Date.now() - printedAt.getTime()) / 60000)) : null;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="bg-[#0F172A]/40" />
                <DialogPrimitive.Popup
                    data-slot="dialog-content"
                    className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-[var(--qrc-line)] bg-white p-5 outline-none qrc-fade-in"
                >
                    <Eyebrow className="text-[var(--qrc-danger)] mb-2">Possible duplicate print</Eyebrow>
                    <p className="text-[14px] text-[var(--qrc-ink)] leading-relaxed mb-1">
                        <b className="qrc-mono">{matchedCount}</b>{" "}
                        {matchedCount === 1 ? "of these codes was" : "of these codes were"} printed{" "}
                        {minsAgo !== null ? <b>{minsAgo} min ago</b> : ""}
                        {firstMatch?.printedBy ? (
                            <>
                                {" "}by <b>{firstMatch.printedBy}</b>
                            </>
                        ) : null}
                        .
                    </p>
                    <p className="text-[13px] text-[var(--qrc-ink3)] mb-4">
                        {label ? `${label} — reprint anyway?` : "Reprint anyway?"}
                        {firstMatch?.printJobId ? (
                            <span className="block mt-1 text-[12px] text-[var(--qrc-ink3)]">
                                Prior job <span className="qrc-mono">#{firstMatch.printJobId}</span>
                            </span>
                        ) : null}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                        <DangerButton onClick={onConfirm}>Reprint anyway</DangerButton>
                    </div>
                </DialogPrimitive.Popup>
            </DialogPortal>
        </Dialog>
    );
}

import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { PrimaryButton, SecondaryButton, Eyebrow } from "../ui/qrcUi";

export default function VolumeConfirmModal({ modal, onClose, onConfirm }) {
    if (!modal || modal.kind !== "volume") return null;
    const { count, media } = modal;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="bg-[#0F172A]/40" />
                <DialogPrimitive.Popup
                    data-slot="dialog-content"
                    className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-[var(--qrc-line)] bg-white p-5 outline-none qrc-fade-in"
                >
                    <Eyebrow className="text-[var(--qrc-warn)] mb-2">Large print job</Eyebrow>
                    <p className="text-[14px] text-[var(--qrc-ink)] leading-relaxed mb-1">
                        This job will generate <b className="qrc-mono">{Number(count).toLocaleString("en-IN")}</b> labels.
                    </p>
                    {media ? <p className="text-[13px] text-[var(--qrc-ink3)] mb-4">Estimated media: {media}.</p> : <div className="mb-4" />}
                    <div className="flex items-center justify-end gap-2">
                        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                        <PrimaryButton onClick={onConfirm}>Proceed</PrimaryButton>
                    </div>
                </DialogPrimitive.Popup>
            </DialogPortal>
        </Dialog>
    );
}

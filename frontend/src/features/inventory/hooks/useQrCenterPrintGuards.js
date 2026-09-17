import { useCallback, useState } from "react";
import { usePrintCheckApi } from "./usePrintCheckApi.js";
import { VOLUME_THRESHOLD } from "../utils/qrCenterConstants.js";

// Centralises the two confirmation modals the mockup shows before any print job fires:
//  - duplicate-print guard: POST /qr-center/print-check against real stockItemQrIds
//  - volume guard: client-side threshold check (>500 labels) before a big job
// Instantiated once in QrCenter.jsx and passed down to every zone that can trigger a print.
export function useQrCenterPrintGuards() {
    const [modal, setModal] = useState(null); // { kind: 'duplicate' | 'volume', ...payload }
    const printCheckMutation = usePrintCheckApi();

    const closeModal = useCallback(() => setModal(null), []);

    // stockItemQrIds: number[] of *existing* QR rows being reprinted (may be empty for
    // brand-new codes, in which case the duplicate guard is a no-op and onConfirm runs directly).
    const guardDuplicate = useCallback(
        async ({ stockItemQrIds = [], label, onConfirm }) => {
            if (!stockItemQrIds.length) {
                onConfirm();
                return;
            }
            try {
                const res = await printCheckMutation.mutateAsync({ stockItemQrIds });
                const matches = res?.data?.recentMatches ?? [];
                if (matches.length > 0) {
                    setModal({
                        kind: "duplicate",
                        label,
                        matchedCount: res.data.matchedCount ?? matches.length,
                        firstMatch: matches[0],
                        onConfirm,
                    });
                    return;
                }
                onConfirm();
            } catch {
                // If the guard check itself fails, don't silently block the user — proceed,
                // the print action's own error handling will surface any real failure.
                onConfirm();
            }
        },
        [printCheckMutation]
    );

    const guardVolume = useCallback(({ count, media, onConfirm }) => {
        if (!count || count <= VOLUME_THRESHOLD) {
            onConfirm();
            return;
        }
        setModal({ kind: "volume", count, media, onConfirm });
    }, []);

    const confirmModal = useCallback(() => {
        const active = modal;
        setModal(null);
        active?.onConfirm?.();
    }, [modal]);

    return { modal, closeModal, guardDuplicate, guardVolume, confirmModal, printCheckPending: printCheckMutation.isPending };
}

import { useEffect, useRef } from "react";
import QrTagPrintSheet from "../../stock-in/qrTagStudio/QrTagPrintSheet.jsx";
import { downloadTagSheetPdf } from "../../../utils/qrTagPdf.js";

// Mounts the full-size tag sheet only for the moment it is needed — a PDF download or a browser
// print of thermal labels — then reports back. The sheet draws one QR canvas per tag, so it is not
// kept mounted while the studio is merely being looked at.
//   job: { mode: "pdf" | "print", tags }
export default function SheetJob({ job, sheet, buildTagData, fileName, onPrinted, onDone, onError }) {
    const callbacks = useRef({ onPrinted, onDone, onError });
    useEffect(() => {
        callbacks.current = { onPrinted, onDone, onError };
    });

    useEffect(() => {
        const handleAfterPrint = () => callbacks.current.onPrinted();
        // The QR canvases are drawn by the sheet's own effects, a moment after it mounts.
        const timer = setTimeout(() => {
            if (job.mode === "pdf") {
                try {
                    downloadTagSheetPdf({ ...sheet, tags: job.tags, buildTagData, fileName });
                    callbacks.current.onDone();
                } catch (error) {
                    callbacks.current.onError(error);
                }
                return;
            }
            window.addEventListener("afterprint", handleAfterPrint, { once: true });
            window.print();
        }, 200);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job]);

    return <QrTagPrintSheet {...sheet} tags={job.tags} buildTagData={buildTagData} />;
}

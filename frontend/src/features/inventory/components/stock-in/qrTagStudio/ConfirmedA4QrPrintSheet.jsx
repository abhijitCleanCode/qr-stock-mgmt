import { useEffect, useRef } from "react";
import QrCodeImage from "../../qr-center/QrCodeImage";

const LABELS_PER_SHEET = 65;

const ConfirmedA4QrPrintSheet = ({ items, startAt, onAfterPrint }) => {
  const onAfterPrintRef = useRef(onAfterPrint);

  useEffect(() => {
    onAfterPrintRef.current = onAfterPrint;
  }, [onAfterPrint]);

  useEffect(() => {
    const handleAfterPrint = () => onAfterPrintRef.current();
    window.addEventListener("afterprint", handleAfterPrint, { once: true });
    const frame = window.requestAnimationFrame(() => window.print());

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const skippedSlots = Math.max(0, Number(startAt) - 1);
  const sheetCount = Math.max(1, Math.ceil((items.length + skippedSlots) / LABELS_PER_SHEET));
  const pages = [];

  for (let pageIndex = 0; pageIndex < sheetCount; pageIndex += 1) {
    const pageStart = pageIndex * LABELS_PER_SHEET;
    const blankCount = Math.max(0, Math.min(LABELS_PER_SHEET, skippedSlots - pageStart));
    const firstItemIndex = Math.max(0, pageStart - skippedSlots);
    const itemCount = Math.min(LABELS_PER_SHEET - blankCount, items.length - firstItemIndex);
    const cells = [];

    for (let index = 0; index < blankCount; index += 1) {
      cells.push(<div key={`blank-${pageIndex}-${index}`} aria-hidden="true" />);
    }

    for (let index = 0; index < itemCount; index += 1) {
      const item = items[firstItemIndex + index];
      const payload = item.payload ?? {};
      cells.push(
        <div
          key={`qr-${item.stockItemId}`}
          className="flex items-center gap-[1mm] overflow-hidden border border-black p-[1mm] font-mono text-black"
          style={{ width: "38.1mm", height: "21.2mm", boxSizing: "border-box" }}
        >
          <QrCodeImage
            value={JSON.stringify(payload)}
            size={160}
            style={{ width: "16mm", height: "16mm" }}
            className="shrink-0"
          />
          <div className="min-w-0 overflow-hidden leading-tight">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-bold" style={{ fontSize: "2mm" }}>
              {item.design?.code ?? payload.designCode ?? "STOCK"}
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: "1.7mm" }}>
              {item.variant?.colorName ?? payload.colorName ?? ""}
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: "1.7mm" }}>
              {item.type ?? "ITEM"} · {payload.setId ?? item.stockItemId}
            </div>
          </div>
        </div>,
      );
    }

    pages.push(
      <div
        key={`page-${pageIndex}`}
        style={{
          width: "210mm",
          height: "297mm",
          display: "grid",
          placeItems: "center",
          breakAfter: pageIndex < sheetCount - 1 ? "page" : "auto",
          pageBreakAfter: pageIndex < sheetCount - 1 ? "always" : "auto",
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(5, 38.1mm)",
            gridTemplateRows: "repeat(13, 21.2mm)",
            width: "190.5mm",
            height: "275.6mm",
          }}
        >
          {cells}
        </div>
      </div>,
    );
  }

  return (
    <div id="confirmed-a4-qr-print" className="hidden print:block">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #confirmed-a4-qr-print, #confirmed-a4-qr-print * { visibility: visible; }
          #confirmed-a4-qr-print { position: absolute; inset: 0; }
        }
      `}</style>
      {pages}
    </div>
  );
};

export default ConfirmedA4QrPrintSheet;

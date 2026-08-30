import QrCodeImage from "./QrCodeImage";
import { buildQrValue } from "../../utils/qrLabel";

const QrLabelPrint = ({ item }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-black/20 p-4 text-center break-inside-avoid">
    <QrCodeImage value={buildQrValue(item.qr.payload)} size={140} />
    <div className="flex flex-col">
      <span className="text-sm font-semibold">{item.designCode}</span>
      <span className="text-xs">
        {item.colorName} · {item.type}
      </span>
      <span className="text-[10px] text-gray-500">Stock #{item.stockItemId}</span>
    </div>
  </div>
);

// Always mounted, invisible on screen — only rendered on paper. The @media print rule hides
// every other element in the document (including the app's own nav/sidebar chrome, which
// lives outside this page in MainLayout) and reveals only this sheet and its children.
const QrPrintSheet = ({ items }) => (
  <div id="qr-print-sheet" className="hidden print:block">
    <style>{`
      @media print {
        @page { margin: 12mm; }
        body * { visibility: hidden; }
        #qr-print-sheet, #qr-print-sheet * { visibility: visible; }
        #qr-print-sheet { position: absolute; inset: 0; }
      }
    `}</style>
    <div className="grid grid-cols-2 gap-6 p-4">
      {items.map((item) => (
        <QrLabelPrint key={item.stockItemId} item={item} />
      ))}
    </div>
  </div>
);

export default QrPrintSheet;

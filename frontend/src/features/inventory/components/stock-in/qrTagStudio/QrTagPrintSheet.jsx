import QrCodeImage from "../../qr-center/QrCodeImage";
import LabelTag from "./LabelTag";
import { A4_PRESETS } from "../../../utils/qrTagStudio";

// The on-screen "Live preview" (TagRoll / A4SheetPreview) is a scrollable, zoomable review
// widget — great for checking the job, wrong to print from directly: A4SheetPreview only
// ever mounts the one sheet currently being viewed, and window.print() would otherwise
// rasterize the whole wizard page (header, other steps, filter bar, scrollbars) instead of
// just the labels — which is why a downloaded PDF looked like a random crop of the app
// rather than aligned label sheets.
//
// This component is the actual print source instead: always mounted with every sheet/tag in
// the job at true physical (mm) size, invisible on screen, and revealed only by the
// `@media print` rule below — which also hides everything else in the document, the same
// visibility trick used by QrPrintSheet for the QR Center page.
const QrTagPrintSheet = ({ engine, tags, a4Preset, a4StartAt, fields, qrmm, typography, buildTagData }) => {
  if (tags.length === 0) return null;

  return (
    <div id="qr-tag-print-sheet" className="hidden print:block">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          #qr-tag-print-sheet, #qr-tag-print-sheet * { visibility: visible; }
          #qr-tag-print-sheet { position: absolute; inset: 0; }
        }
      `}</style>
      {engine === "thermal" ? (
        <ThermalPrintRoll tags={tags} buildTagData={buildTagData} fields={fields} qrmm={qrmm} typography={typography} />
      ) : (
        <A4PrintPages tags={tags} a4Preset={a4Preset} startAt={a4StartAt} buildTagData={buildTagData} qrmm={qrmm} />
      )}
    </div>
  );
};

// No physical roll width to match on paper — each label is printed at its natural size, one
// after another, and never split across a page break.
const ThermalPrintRoll = ({ tags, buildTagData, fields, qrmm, typography }) => (
  <div className="flex flex-col items-start gap-3">
    {tags.map((tag) => (
      <div key={tag.id} style={{ breakInside: "avoid" }}>
        <LabelTag kind={tag.kind} data={buildTagData(tag)} fields={fields} qrmm={qrmm} typography={typography} qrValue={tag.code} />
      </div>
    ))}
  </div>
);

// Rebuilds every sheet the job needs (not just the one currently paginated on screen), laid
// out with the die-cut grid's real mm dimensions so cells line up with the physical sticker
// sheet, with one `page-break-after` per sheet so a 3-sheet job actually prints 3 pages.
const A4PrintPages = ({ tags, a4Preset, startAt, buildTagData, qrmm }) => {
  const grid = A4_PRESETS[a4Preset];
  const perSheet = grid.c * grid.r;
  const skip = Math.max(0, Number(startAt) - 1);
  const sheetCount = Math.max(1, Math.ceil((tags.length + skip) / perSheet));

  const sheets = [];
  for (let s = 0; s < sheetCount; s++) {
    const cells = [];
    const pageStart = s * perSheet;
    const leadingSlots = Math.max(0, Math.min(perSheet, skip - pageStart));
    const firstTagIndex = Math.max(0, pageStart - skip);
    const tagCount = Math.min(perSheet - leadingSlots, Math.max(0, tags.length - firstTagIndex));

    for (let i = 0; i < leadingSlots; i++) {
      cells.push(<div key={`skip-${i}`} aria-hidden="true" />);
    }
    for (let i = 0; i < tagCount; i++) {
      const tag = tags[firstTagIndex + i];
      const data = buildTagData(tag);
      cells.push(
        <div
          key={`tag-${i}`}
          className="flex min-w-0 items-center overflow-hidden border border-slate-300 font-mono"
          style={{ width: `${grid.w}mm`, height: `${grid.h}mm`, padding: "1mm", gap: "1mm" }}
        >
          <QrCodeImage value={tag.code} size={200} style={{ width: `${qrmm}mm`, height: `${qrmm}mm` }} className="shrink-0" />
          <div className="min-w-0 flex-1 overflow-hidden leading-tight">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap font-bold" style={{ fontSize: "2mm" }}>
              {tag.code}
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-600" style={{ fontSize: "1.7mm" }}>
              {data.designCode} · {data.variantName}
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-600" style={{ fontSize: "1.7mm" }}>
              {tag.kind === "parent" ? `${tag.isSemiSet ? "SEMI" : "SET"} ${tag.piecesPerSet}-PC` : `SIZE ${tag.size}`}
            </div>
            <div className="font-bold" style={{ fontSize: "1.9mm" }}>
              {tag.kind === "parent" ? data.bundlePrice : data.piecePrice}
            </div>
          </div>
        </div>
      );
    }
    sheets.push(
      <div
        key={s}
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${grid.c}, ${grid.w}mm)`,
          gridTemplateRows: `repeat(${grid.r}, ${grid.h}mm)`,
          height: `${grid.r * grid.h}mm`,
          pageBreakAfter: s < sheetCount - 1 ? "always" : "auto",
        }}
      >
        {cells}
      </div>
    );
  }

  return <>{sheets}</>;
};

export default QrTagPrintSheet;

import QrCodeImage from "../../qr-center/QrCodeImage";
import { A4_PRESETS, labelDims } from "../../../utils/qrTagStudio";

const KIND_BRACKET = { parent: "PARENT SET", child: "GARMENT PIECE", loose: "LOOSE PIECE" };
const FONT_SCALE = { compact: 0.85, standard: 1, large: 1.18 };

// Deterministic "barcode" bars — a cosmetic Code128-style flourish under the parent tag
// (matches the reference mock, which is equally decorative there: it never encodes real
// data, only the QR above it does).
function barcodeBars(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = [];
  for (let i = 0; i < 40; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    bars.push(hash % 2 === 0 ? 2 : 1);
  }
  return bars;
}

function LabelTag({ kind, data, fields, qrmm, typography, qrValue }) {
  const fs = FONT_SCALE[typography];
  const f = fields[kind];

  return (
    <div className="relative border border-slate-500 bg-white p-[6px] font-mono text-black" style={{ fontSize: `${fs}em` }}>
      {f.firm && (
        <div className="mb-1 flex justify-between border-b border-slate-300 pb-0.5 text-[6.5px] tracking-wide text-slate-600">
          <span>{data.firm}</span>
          <span>[{KIND_BRACKET[kind]}]</span>
        </div>
      )}
      <div className="flex items-start gap-1.5">
        <QrCodeImage value={qrValue} size={Math.round(qrmm * 3)} className="shrink-0 rounded-sm border border-slate-200" />
        <div className="min-w-0 flex-1 leading-tight">
          {f.design && <div className="text-[11px] font-bold tracking-tight">{data.designCode}</div>}
          {f.dname && <div className="text-[7px] font-medium tracking-wide">{data.designName}</div>}
          {f.variant && <div className="text-[6.5px] tracking-wide text-slate-600">{data.variantName}</div>}

          {kind === "parent" && (
            <>
              {f.comp && <div className="mt-0.5 text-[8.5px] font-bold">SET: {data.composition} ({data.piecesPerSet} Pcs)</div>}
              {f.jobber && <div className="text-[5.6px] tracking-wide text-slate-500">{data.jobber}</div>}
              {f.price && <div className="mt-0.5 text-[8px] font-bold">MRP {data.bundlePrice}</div>}
              {f.date && <div className="text-[5.6px] tracking-wide text-slate-500">INWARD {data.date}</div>}
            </>
          )}
          {(kind === "child" || kind === "loose") && (
            <>
              {f.size && <div className="mt-0.5 text-[8.5px] font-bold">SIZE {data.size}</div>}
              {kind === "child" && f.parent && (
                <div className="text-[5.6px] tracking-wide text-slate-500">PARENT: {data.parentSetId}</div>
              )}
              {f.jobber && <div className="text-[5.6px] tracking-wide text-slate-500">{data.jobber}</div>}
              {f.price && <div className="mt-0.5 text-[8px] font-bold">MRP {data.piecePrice}</div>}
              {kind === "loose" && f.origin && (
                <div className="mt-0.5 inline-block border-[0.7px] border-black px-[3px] py-[0.5px] text-[5.8px] font-bold tracking-wide">
                  LOOSE — FROM JOBBER
                </div>
              )}
              {kind === "loose" && f.date && <div className="text-[5.6px] tracking-wide text-slate-500">LOOSE SINCE {data.date}</div>}
            </>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-end justify-between gap-1.5 border-t border-slate-200 pt-0.5">
        <span className="text-[6px] tracking-wide text-slate-600">{data.pieceId}</span>
        {kind === "parent" && f.bar && (
          <div className="flex h-[11px] flex-1 items-stretch justify-end gap-[0.8px] overflow-hidden">
            {barcodeBars(data.pieceId).map((w, i) => (
              <span key={i} className="block bg-black" style={{ width: `${w}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LabelPreview = ({ engine, thermalPreset, a4Preset, a4StartAt, activeTab, data, fields, qrmm, typography, strategy, qrValue }) => {
  const dims = labelDims(engine, thermalPreset, a4Preset);

  if (engine === "thermal") {
    const showDual = strategy === "parentChild" && thermalPreset === "50x30" && activeTab === "parent";
    return (
      <div className="w-full max-w-[340px]">
        <div className="flex justify-between rounded-t-[5px] bg-slate-800 px-2.5 py-1.5 font-mono text-[9.5px] tracking-wide text-slate-400">
          <span>
            <span className="text-emerald-400">●</span> {data.printerShort} FEED MOUTH
          </span>
          <span>GAP SENSOR: ACTIVE</span>
        </div>
        <LabelTag kind={activeTab} data={data} fields={fields} qrmm={qrmm} typography={typography} qrValue={qrValue} />
        {showDual && (
          <>
            <div className="relative my-0 border-t border-dashed border-slate-400">
              <span className="absolute -top-[5px] left-0 size-[9px] bg-slate-900" />
            </div>
            <LabelTag kind="child" data={data} fields={fields} qrmm={qrmm} typography={typography} qrValue={data.childQrValue} />
          </>
        )}
      </div>
    );
  }

  const grid = A4_PRESETS[a4Preset];
  const start = Number(a4StartAt) || 0;
  const cellQrPx = Math.max(9, Math.round(qrmm * 0.55));
  const cells = [];
  for (let i = 0; i < grid.c * grid.r; i++) {
    const used = i < start;
    const seqId = activeTab === "parent" ? `${data.designCode}-${i + 1}` : `${data.designCode}-CH-${i + 1}`;
    cells.push(
      <div key={i} className={`flex min-w-0 items-center gap-[2.5px] overflow-hidden border-[0.5px] border-slate-300 p-[2px] ${used ? "border-dashed bg-slate-100" : ""}`}>
        {!used && (
          <>
            <QrCodeImage value={seqId} size={cellQrPx} />
            <div className="min-w-0 overflow-hidden font-mono leading-tight">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.6px] font-bold">{seqId}</div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.1px] text-slate-600">
                {data.designCode} · {data.variantName}
              </div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.1px] text-slate-600">
                {activeTab === "parent" ? `SET ${data.piecesPerSet}-PC` : `SIZE ${data.size}`}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="aspect-[210/297] w-full max-w-[330px] overflow-hidden border border-slate-400 bg-white p-2">
      <div className="mb-1 border-b border-slate-300 pb-[3px] font-mono text-[5.6px] tracking-wide text-slate-500">
        A4 DIE-CUT STICKER SHEET (210 × 297 mm) — {grid.c} COLUMNS × {grid.r} ROWS · {grid.c * grid.r} LABELS · {start} USED
      </div>
      <div className="grid gap-[2.5px]" style={{ gridTemplateColumns: `repeat(${grid.c}, 1fr)` }}>
        {cells}
      </div>
      <p className="sr-only">{dims.w} × {dims.h} mm</p>
    </div>
  );
};

export default LabelPreview;

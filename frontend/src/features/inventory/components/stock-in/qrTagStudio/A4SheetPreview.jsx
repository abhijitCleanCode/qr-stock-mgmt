import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import QrCodeImage from "../../qr-center/QrCodeImage";
import { A4_PRESETS } from "../../../utils/qrTagStudio";

// Real per-cell pagination — unlike a static sample grid, "used" cells for the start-at
// skip and every non-skipped cell's actual queued tag, matching what Download PDF /
// Send to printer will produce sheet-by-sheet.
const A4SheetPreview = ({ tags, a4Preset, startAt, buildTagData, qrmm }) => {
  const grid = A4_PRESETS[a4Preset];
  const perSheet = grid.c * grid.r;
  const skip = Math.max(0, Number(startAt) - 1);
  const sheetCount = Math.max(1, Math.ceil((tags.length + skip) / perSheet));
  const [rawSheet, setSheet] = useState(0);
  // Clamped during render (never via an effect) — filters/pagination inputs changing can
  // shrink sheetCount below whatever page the user was previously on.
  const sheet = Math.min(rawSheet, sheetCount - 1);

  const cellQrPx = Math.max(9, Math.round(qrmm * 0.55));
  const cells = [];
  for (let i = 0; i < perSheet; i++) {
    const absoluteIndex = sheet * perSheet + i;
    const tag = absoluteIndex >= skip ? tags[absoluteIndex - skip] : undefined;
    if (!tag) {
      cells.push(<div key={i} className="border-[0.5px] border-dashed border-slate-300 bg-slate-100" />);
      continue;
    }
    const data = buildTagData(tag);
    const bad = tag.flags?.some((flag) => flag.level === "bad");
    cells.push(
      <div key={i} className={`flex min-w-0 items-center gap-[2.5px] overflow-hidden border-[0.5px] p-[2px] ${bad ? "border-red-400 bg-red-50" : "border-slate-300"}`}>
        <QrCodeImage value={tag.code} size={cellQrPx} />
        <div className="min-w-0 overflow-hidden font-mono leading-tight">
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.6px] font-bold">{tag.code}</div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.1px] text-slate-600">{data.designCode} · {data.variantName}</div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[3.1px] text-slate-600">
            {tag.kind === "parent" ? `${tag.isSemiSet ? "SEMI" : "SET"} ${tag.piecesPerSet}-PC` : `SIZE ${tag.size}`}
          </div>
          <div className="text-[3.4px] font-bold">{tag.kind === "parent" ? data.bundlePrice : data.piecePrice}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-3 pb-2 font-mono text-xs font-bold text-slate-700">
        <button type="button" onClick={() => setSheet((s) => Math.max(0, s - 1))} disabled={sheet === 0} className="grid size-7 place-items-center rounded-md border border-slate-400 disabled:opacity-35">
          <ChevronLeft className="size-4" />
        </button>
        <span>SHEET {sheet + 1} OF {sheetCount}</span>
        <button type="button" onClick={() => setSheet((s) => Math.min(sheetCount - 1, s + 1))} disabled={sheet >= sheetCount - 1} className="grid size-7 place-items-center rounded-md border border-slate-400 disabled:opacity-35">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mx-auto aspect-[210/297] w-full max-w-[370px] overflow-hidden border border-slate-400 bg-white p-2">
        <div className="mb-1 flex justify-between border-b border-slate-300 pb-[3px] font-mono text-[5.4px] tracking-wide text-slate-500">
          <span>A4 DIE-CUT ({grid.c}×{grid.r} · {perSheet} LABELS)</span>
          <span>{sheet === 0 && skip > 0 ? `${skip} SKIPPED` : ""}</span>
        </div>
        <div className="grid gap-[2.5px]" style={{ gridTemplateColumns: `repeat(${grid.c}, 1fr)` }}>
          {cells}
        </div>
      </div>
    </div>
  );
};

export default A4SheetPreview;

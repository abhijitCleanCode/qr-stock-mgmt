import { jsPDF } from "jspdf";

import { A4_PRESETS, labelDims } from "./qrTagStudio";

// Builds the tag sheets as a PDF file (never touches a printer). QR images are read off the
// canvases QrTagPrintSheet already renders for every tag in the job, so the PDF always matches
// what would be printed. A4 jobs get one page per die-cut sheet; thermal jobs get one
// label-sized page per tag.
export function downloadTagSheetPdf({ engine, tags, a4Preset, a4StartAt, thermalPreset, qrmm, buildTagData, fileName }) {
  const canvases = [...document.querySelectorAll("#qr-tag-print-sheet canvas")];
  if (tags.length === 0 || canvases.length < tags.length) {
    throw new Error("The tag sheet isn't ready yet — try again in a moment.");
  }
  const qrOf = (index) => canvases[index].toDataURL("image/png");

  if (engine === "thermal") {
    const { w, h } = labelDims("thermal", thermalPreset, a4Preset);
    const pdf = new jsPDF({ unit: "mm", format: [w, h], orientation: w > h ? "landscape" : "portrait" });
    tags.forEach((tag, index) => {
      if (index > 0) pdf.addPage([w, h], w > h ? "landscape" : "portrait");
      drawLabel(pdf, tag, buildTagData(tag), qrOf(index), 0, 0, w, h, qrmm);
    });
    pdf.save(fileName);
    return;
  }

  const grid = A4_PRESETS[a4Preset];
  const perSheet = grid.c * grid.r;
  const skip = Math.max(0, Number(a4StartAt || 1) - 1);
  const originX = (210 - grid.c * grid.w) / 2;
  const originY = (297 - grid.r * grid.h) / 2;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  tags.forEach((tag, index) => {
    const slot = index + skip;
    const slotOnSheet = slot % perSheet;
    if (index > 0 && slotOnSheet === 0) pdf.addPage("a4", "portrait");
    if (index === 0 && slot >= perSheet) {
      for (let page = 0; page < Math.floor(slot / perSheet); page++) pdf.addPage("a4", "portrait");
    }
    const x = originX + (slotOnSheet % grid.c) * grid.w;
    const y = originY + Math.floor(slotOnSheet / grid.c) * grid.h;
    drawLabel(pdf, tag, buildTagData(tag), qrOf(index), x, y, grid.w, grid.h, qrmm);
  });
  pdf.save(fileName);
}

function drawLabel(pdf, tag, data, qrImage, x, y, w, h, qrmm) {
  const pad = 1;
  const qr = Math.min(qrmm, h - pad * 2);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.1);
  pdf.rect(x, y, w, h);
  pdf.addImage(qrImage, "PNG", x + pad, y + (h - qr) / 2, qr, qr);

  const textX = x + pad * 2 + qr;
  const maxWidth = x + w - pad - textX;
  const lines = [
    { text: tag.code, size: 6, bold: true },
    { text: `${data.designCode} · ${data.variantName}`, size: 5, bold: false },
    { text: tag.kind === "parent" ? `${tag.isSemiSet ? "SEMI" : "SET"} ${tag.piecesPerSet}-PC` : `SIZE ${tag.size}`, size: 5, bold: false },
    { text: tag.kind === "parent" ? data.bundlePrice : data.piecePrice, size: 5.5, bold: true },
  ];
  let cursor = y + (h - lines.length * 3.2) / 2 + 2.4;
  for (const line of lines) {
    pdf.setFont("courier", line.bold ? "bold" : "normal");
    pdf.setFontSize(line.size);
    pdf.setTextColor(15, 23, 42);
    pdf.text(pdf.splitTextToSize(String(line.text), maxWidth)[0], textX, cursor);
    cursor += 3.2;
  }
}

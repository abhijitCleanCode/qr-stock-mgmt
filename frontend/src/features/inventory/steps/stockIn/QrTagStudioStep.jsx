import { useMemo, useState } from "react";

import StrategyCards from "../../components/stock-in/qrTagStudio/StrategyCards";
import GenerationQueue from "../../components/stock-in/qrTagStudio/GenerationQueue";
import TagContentConfig from "../../components/stock-in/qrTagStudio/TagContentConfig";
import QrPayloadPanel from "../../components/stock-in/qrTagStudio/QrPayloadPanel";
import PrintEngineConfig from "../../components/stock-in/qrTagStudio/PrintEngineConfig";
import LabelPreview from "../../components/stock-in/qrTagStudio/LabelPreview";
import { getVariantKey } from "../../utils/variantKey";
import { getVariantDisplayCode } from "../../utils/variantDisplay";
import {
  aggregateRows,
  computeVariantRow,
  defaultFieldState,
  fieldCapacity,
  labelDims,
} from "../../utils/qrTagStudio";

const FIRM_LABEL = "STOCK MGMT";

const formatDdMmYy = (isoDate) => {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y.slice(2)}`;
};

const QrTagStudioStep = ({
  selectedVariants,
  variantTotals,
  qcByKey,
  jobber,
  challanNo,
  challanDate,
  defectAction,
  printStrategy,
  onPrintStrategyChange,
  perVariantSettings,
  onToggleVariantIncluded,
  onToggleVariantChildTags,
  printer,
  onPrinterChange,
  onTestPrint,
}) => {
  const [activeTab, setActiveTab] = useState("parent");
  const [engine, setEngine] = useState("thermal");
  const [thermalPreset, setThermalPreset] = useState("50x30");
  const [a4Preset, setA4Preset] = useState("24");
  const [a4StartAt, setA4StartAt] = useState(1);
  const [qrmm, setQrmm] = useState(17);
  const [typography, setTypography] = useState("standard");
  const [fields, setFields] = useState(defaultFieldState);

  const toggleField = (tab, key) => {
    setFields((prev) => ({ ...prev, [tab]: { ...prev[tab], [key]: !prev[tab][key] } }));
  };

  // Normalizes selected variants + their live Step 2 (Set Matrix) totals + Step 3 (QC &
  // Defect) results into the flat shape every panel below reads from — the single place
  // this step touches shared wizard state.
  const variants = useMemo(
    () =>
      selectedVariants.map((variant) => {
        const key = getVariantKey(variant);
        const totals = variantTotals[key] ?? { setsTotal: 0, looseTotal: 0, piecesPerSet: 0, garmentsTotal: 0, sizeLabels: [] };
        const qc = qcByKey[key] ?? { passed: totals.garmentsTotal, defects: 0 };
        return {
          key,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          code: getVariantDisplayCode(variant),
          designCode: variant.designCode,
          designName: variant.designName,
          sellingPricePerPiece: variant.sellingPricePerPiece,
          setsTotal: totals.setsTotal,
          looseTotal: totals.looseTotal,
          piecesPerSet: totals.piecesPerSet,
          sizeLabels: totals.sizeLabels,
          qcPassed: Number(qc.passed) || 0,
          qcDefects: Number(qc.defects) || 0,
        };
      }),
    [selectedVariants, variantTotals, qcByKey]
  );

  const rows = useMemo(() => variants.map((v) => computeVariantRow(v, printStrategy, perVariantSettings)), [
    variants,
    printStrategy,
    perVariantSettings,
  ]);
  const totals = useMemo(() => aggregateRows(rows), [rows]);

  const primaryVariant =
    variants.find((v) => (perVariantSettings[v.key] ?? { included: true }).included !== false) ?? variants[0];

  const sampleSize = primaryVariant?.sizeLabels?.[0] ?? "-";
  const setSuffix = primaryVariant ? String(primaryVariant.setsTotal).padStart(3, "0") : "000";
  const parentSetId = primaryVariant ? `SET-${primaryVariant.code}-${setSuffix}` : "SET-NONE";
  const childId = primaryVariant ? `${primaryVariant.code}-${sampleSize}-01` : "—";
  const looseId = primaryVariant ? `${primaryVariant.code}-${sampleSize}-L01` : "—";
  const currentTagId = activeTab === "parent" ? parentSetId : activeTab === "child" ? childId : looseId;

  const tagData = {
    firm: FIRM_LABEL,
    designCode: primaryVariant?.designCode ?? "—",
    designName: primaryVariant?.designName ?? "—",
    variantName: (primaryVariant?.colorName ?? "—").toUpperCase(),
    composition: primaryVariant?.sizeLabels?.join(" · ") || "—",
    piecesPerSet: primaryVariant?.piecesPerSet ?? 0,
    jobber: jobber?.name ? `#${jobber.name.toUpperCase()}` : "UNASSIGNED",
    bundlePrice: `₹ ${((primaryVariant?.sellingPricePerPiece ?? 0) * (primaryVariant?.piecesPerSet ?? 0)).toLocaleString("en-IN")} (SET)`,
    piecePrice: `₹ ${(primaryVariant?.sellingPricePerPiece ?? 0).toLocaleString("en-IN")}`,
    date: formatDdMmYy(challanDate),
    size: sampleSize,
    parentSetId,
    pieceId: currentTagId,
    printerShort: printer.split(" [")[0]?.split(" ").slice(0, 2).join(" ") ?? printer,
    childQrValue: childId,
  };

  const capacity = fieldCapacity(engine, thermalPreset, a4Preset, typography);
  const dims = labelDims(engine, thermalPreset, a4Preset);

  const mediaUsage =
    engine === "thermal"
      ? `${((totals.total * (dims.h + 3)) / 1000).toFixed(1)} m`
      : `${Math.ceil((totals.total + Number(a4StartAt || 0)) / (dims.c * dims.r))} sheets`;

  return (
    <div className="space-y-6">
      {(challanNo || jobber?.name) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
          {challanNo && <span>{challanNo}</span>}
          {challanNo && jobber?.name && <span className="text-slate-300">·</span>}
          {jobber?.name && <span>{jobber.name}</span>}
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-800">{variants.reduce((sum, v) => sum + v.qcPassed, 0)} pcs passed QC</span>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="text-[14.5px] font-bold tracking-tight text-slate-900">1 · Tagging strategy</h3>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-px font-mono text-[10px] font-bold tracking-wide text-emerald-700">
            DECIDE FIRST
          </span>
        </div>
        <p className="mb-3.5 max-w-[74ch] text-[13px] text-slate-500">
          This choice sets how many labels get printed and how much hand-applying the godown has to do. Everything
          below reacts to it.
        </p>
        {variants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No variants added yet — go back to Inward Details and Set Matrix first.
          </div>
        ) : (
          <StrategyCards
            variants={variants}
            strategy={printStrategy}
            perVariantSettings={perVariantSettings}
            onStrategyChange={onPrintStrategyChange}
          />
        )}
      </div>

      {variants.length > 0 && (
        <>
          <div>
            <h3 className="mb-1 text-[14.5px] font-bold tracking-tight text-slate-900">2 · Generation queue</h3>
            <GenerationQueue
              variants={variants}
              strategy={printStrategy}
              perVariantSettings={perVariantSettings}
              onToggleIncluded={onToggleVariantIncluded}
              onToggleChildTags={onToggleVariantChildTags}
              defectAction={defectAction}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="space-y-4">
              <TagContentConfig activeTab={activeTab} onTabChange={setActiveTab} fields={fields} onToggleField={toggleField} capacity={capacity} />
              <QrPayloadPanel code={currentTagId} />
              <PrintEngineConfig
                engine={engine}
                onEngineChange={setEngine}
                thermalPreset={thermalPreset}
                onThermalPresetChange={setThermalPreset}
                a4Preset={a4Preset}
                onA4PresetChange={setA4Preset}
                printer={printer}
                onPrinterChange={onPrinterChange}
                onTestPrint={() => onTestPrint(currentTagId)}
                qrmm={qrmm}
                onQrmmChange={setQrmm}
                typography={typography}
                onTypographyChange={setTypography}
              />
              {engine === "a4" && (
                <div className="rounded-[10px] border border-slate-200 bg-white p-4">
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-slate-600">Start at label no.</label>
                  <input
                    type="number"
                    min={1}
                    value={a4StartAt}
                    onChange={(event) => setA4StartAt(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[13px] text-slate-900"
                  />
                  <p className="mt-2 text-[12.3px] leading-snug text-slate-500">
                    Skips the first {a4StartAt || 0} cells so a part-used sheet finishes properly instead of being
                    thrown away.
                  </p>
                </div>
              )}
            </div>

            <div className="sticky top-4">
              <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-[12.5px] font-bold tracking-tight text-slate-900">Live preview</h3>
                  <span className="text-[11.5px] text-slate-500">
                    {tagData.printerShort} · {dims.w} × {dims.h} mm
                  </span>
                </div>
                <div
                  className="flex min-h-[300px] items-start justify-center p-6"
                  style={{
                    backgroundColor: "#E2E8F0",
                    backgroundImage:
                      "linear-gradient(45deg,#DBE2EA 25%,transparent 25%,transparent 75%,#DBE2EA 75%),linear-gradient(45deg,#DBE2EA 25%,transparent 25%,transparent 75%,#DBE2EA 75%)",
                    backgroundSize: "14px 14px",
                    backgroundPosition: "0 0, 7px 7px",
                  }}
                >
                  <LabelPreview
                    engine={engine}
                    thermalPreset={thermalPreset}
                    a4Preset={a4Preset}
                    a4StartAt={a4StartAt}
                    activeTab={activeTab}
                    data={tagData}
                    fields={fields}
                    qrmm={qrmm}
                    typography={typography}
                    strategy={printStrategy}
                    qrValue={currentTagId}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11.5px] text-slate-500">
                  <span>
                    Label <b className="font-mono font-bold text-slate-900">{dims.w} × {dims.h} mm</b>
                  </span>
                  <span>
                    QR <b className="font-mono font-bold text-slate-900">{qrmm} mm</b>
                  </span>
                  <span>
                    Fields <b className="font-mono font-bold text-slate-900">{Object.values(fields[activeTab]).filter(Boolean).length}</b>
                  </span>
                  <span
                    className={`font-semibold ${
                      qrmm < 12 ? "text-red-600" : qrmm < 15 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {qrmm < 12 ? "✕ Scan risk: high" : qrmm < 15 ? "⚠ Scan risk: marginal" : "✓ Scan-safe"}
                  </span>
                </div>
              </div>
              <p className="mt-3 max-w-[78ch] text-[12.3px] text-slate-500">
                <b className="text-slate-900">Preview is size-accurate.</b> The scan-safety meter above is the guard
                rail that matters — anything under 15 mm starts failing on wrinkled poly bags.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="font-mono text-base font-bold tabular-nums text-slate-900">{totals.total}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tags queued</div>
            </div>
            <div>
              <div className="font-mono text-base font-bold tabular-nums text-slate-900">{mediaUsage}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Media</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QrTagStudioStep;

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getVariantKey } from "../../utils/variantKey";
import { getVariantDisplayCode } from "../../utils/variantDisplay";

const DEFECT_CATEGORIES = [
  "No defect detected",
  "Oil stain on collar",
  "Stitching rip on sleeve",
  "Zari thread cut",
  "Size tag mismatch",
  "Stitching unevenness",
  "Other (see remarks)",
];

const QcDefectStep = ({
  selectedVariants,
  variantTotals,
  qcByKey,
  onQcFieldChange,
  defectAction,
  onDefectActionChange,
  qcRemarks,
  onQcRemarksChange,
}) => {
  const totalReceived = Object.values(variantTotals).reduce((sum, item) => sum + item.garmentsTotal, 0);
  const totalDefects = Object.values(qcByKey).reduce((sum, item) => sum + (Number(item.defects) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Inspection &amp; Defect Routing</h3>
          <p className="text-xs text-slate-500">Verify garments against stitching faults, oil stains, or sizing mismatches.</p>
        </div>
        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Total Received: <span className="text-emerald-600">{totalReceived} Pcs</span>
        </span>
      </div>

      <div className="space-y-4">
        {selectedVariants.map((variant) => {
          const key = getVariantKey(variant);
          const expected = variantTotals[key]?.garmentsTotal ?? 0;
          const qc = qcByKey[key] ?? { passed: expected, defects: 0, category: DEFECT_CATEGORIES[0] };

          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-3.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
                  <span className="text-xs font-bold text-slate-900">
                    {variant.colorName} <span className="font-mono text-[11px] text-slate-400">({getVariantDisplayCode(variant)})</span>
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Expected Inward: <strong className="text-slate-800">{expected} Pcs</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Passed (A-Grade) Pcs</label>
                  <Input
                    type="number"
                    min={0}
                    value={qc.passed || ""}
                    onChange={(event) => onQcFieldChange(key, { passed: Number(event.target.value) || 0 })}
                    className="h-[38px] rounded-lg border-slate-200 font-bold text-emerald-700 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Defective / Damaged Pcs</label>
                  <Input
                    type="number"
                    min={0}
                    value={qc.defects || ""}
                    onChange={(event) => onQcFieldChange(key, { defects: Number(event.target.value) || 0 })}
                    className="h-[38px] rounded-lg border-slate-200 font-bold text-red-600 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Defect Category</label>
                  <select
                    value={qc.category}
                    onChange={(event) => onQcFieldChange(key, { category: event.target.value })}
                    className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/10"
                  >
                    {DEFECT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Defect Handling Action (For {totalDefects} Damaged Pcs)
        </label>

        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          <label className="flex cursor-pointer items-start space-x-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-400">
            <input
              type="radio"
              name="defectAction"
              value="return"
              checked={defectAction === "return"}
              onChange={() => onDefectActionChange("return")}
              className="mt-0.5 accent-emerald-600"
            />
            <div>
              <span className="block font-bold text-slate-800">Return to Jobber</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Deducts stitching payable charges for defective pieces directly from the Jobber Ledger.
              </span>
            </div>
          </label>

          <label className="flex cursor-pointer items-start space-x-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-400">
            <input
              type="radio"
              name="defectAction"
              value="seconds"
              checked={defectAction === "seconds"}
              onChange={() => onDefectActionChange("seconds")}
              className="mt-0.5 accent-emerald-600"
            />
            <div>
              <span className="block font-bold text-slate-800">Move to Factory Seconds / Loose (Recommended)</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Pay jobber full amount, but assign discount QR tags for warehouse clearance.
              </span>
            </div>
          </label>
        </div>

        <div className="pt-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">QC Inspection Remarks</label>
          <Textarea
            rows={2}
            placeholder="e.g. 2 pieces returned for re-stitching due to oil spot on back pleat."
            value={qcRemarks}
            onChange={(event) => onQcRemarksChange(event.target.value)}
            className="rounded-lg border-slate-200 bg-white text-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
          />
        </div>
      </div>
    </div>
  );
};

export default QcDefectStep;

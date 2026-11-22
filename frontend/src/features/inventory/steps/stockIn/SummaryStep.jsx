import { AlertCircle } from "lucide-react";

import { getVariantKey } from "../../utils/variantKey";
import { getVariantDisplayCode } from "../../utils/variantDisplay";

// The final review: what was received per variant, how QC split it, and what the inward will
// register. Sets, semi sets and loose pieces show what they become after the defects (see
// utils/qcGroups.js), with the received count alongside when it changed. Each defect is either
// kept in stock (factory seconds) or returned to the jobber; only the kept ones are in stock.
// Counts only — no rupee values on a stock-in.
const SummaryStep = ({ selectedVariants, variantTotals, qcByKey, breakdownByKey = {}, sizeLabelsById, challanNo, issuedChallanNo, nextSerial }) => {
  const labelOf = (sizeId) => sizeLabelsById[sizeId] ?? sizeId;
  const labelsOf = (sizeIds) => sizeIds.map(labelOf).join("-");

  const rows = selectedVariants.map((variant) => {
    const key = getVariantKey(variant);
    const totals = variantTotals[key] ?? { setsTotal: 0, semiSetsTotal: 0, looseTotal: 0, garmentsTotal: 0 };
    const qc = qcByKey[key] ?? { passed: 0, defects: 0 };
    const breakdown = breakdownByKey[key];

    const sets = breakdown ? breakdown.sets : totals.setsTotal;
    const semiSets = breakdown ? breakdown.semiSets : [];
    const newSemiSets = breakdown ? breakdown.newSemiSets : [];
    // The breakdown's loose count already includes the defects kept in stock.
    const loose = breakdown ? breakdown.loose : {};
    const kept = breakdown ? breakdown.keptCount : 0;
    const returned = breakdown ? breakdown.returnedCount : 0;

    const semiCount =
      semiSets.reduce((total, semiSet) => total + semiSet.quantity, 0) +
      newSemiSets.reduce((total, semiSet) => total + semiSet.quantity, 0);
    const looseCount = breakdown
      ? Object.values(loose).reduce((total, quantity) => total + (Number(quantity) || 0), 0)
      : totals.looseTotal;

    // Pieces in stock: everything received, minus the defective pieces returned to the jobber.
    const stockPieces = totals.garmentsTotal - returned;

    return { key, variant, totals, qc, sets, semiSets, newSemiSets, loose, semiCount, looseCount, kept, returned, stockPieces };
  });

  const sum = (pick) => rows.reduce((total, row) => total + pick(row), 0);
  const grandSets = sum((row) => row.sets);
  const grandSemi = sum((row) => row.semiCount);
  const grandLoose = sum((row) => row.looseCount);
  const grandPassed = sum((row) => Number(row.qc.passed) || 0);
  const grandDefects = sum((row) => Number(row.qc.defects) || 0);
  const grandKept = sum((row) => row.kept);
  const grandReturned = sum((row) => row.returned);
  const grandReceived = sum((row) => row.totals.garmentsTotal);
  const grandStock = sum((row) => row.stockPieces);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Final Goods Inward Summary</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="p-3">Variant Name</th>
                <th className="p-3 text-center">Full Sets Inward</th>
                <th className="p-3 text-center">Semi Sets</th>
                <th className="p-3 text-center">Loose Pcs</th>
                <th className="p-3 text-center">QC Passed</th>
                <th className="p-3 text-center">Defective</th>
                <th className="p-3 text-right">Pieces in Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const { key, variant, totals, qc, sets, semiSets, newSemiSets, loose, semiCount, looseCount, kept, returned, stockPieces } = row;
                const looseParts = Object.entries(loose).filter(([, quantity]) => quantity > 0);
                return (
                  <tr key={key} className="align-top">
                    <td className="p-3 font-semibold text-slate-800">
                      <span className="mr-2 inline-block size-2.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
                      {variant.designCode ? `${variant.designCode} · ` : ""}
                      {variant.colorName} ({getVariantDisplayCode(variant)})
                    </td>
                    <td className="p-3 text-center font-bold">
                      {sets} Sets
                      {sets !== totals.setsTotal && <span className="block text-[10.5px] font-medium text-slate-500">from {totals.setsTotal} received</span>}
                    </td>
                    <td className="p-3 text-center">
                      <b>{semiCount} Sets</b>
                      {semiSets.map((semiSet) => (
                        <span key={semiSet.key} className="block font-mono text-[10.5px] font-medium text-slate-500">
                          {semiSet.quantity} × {labelsOf(semiSet.sizeIds)}
                        </span>
                      ))}
                      {newSemiSets.map((semiSet) => (
                        <span key={semiSet.sizeIds.join("-")} className="block font-mono text-[10.5px] font-semibold text-amber-700">
                          {semiSet.quantity} × {labelsOf(semiSet.sizeIds)} (new, created automatically)
                        </span>
                      ))}
                    </td>
                    <td className="p-3 text-center">
                      {looseCount} Pcs
                      {looseParts.length > 0 && (
                        <span className="block font-mono text-[10.5px] font-medium text-slate-500">
                          {looseParts.map(([sizeId, quantity]) => `${labelOf(sizeId)} ×${quantity}`).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-semibold text-emerald-700">{qc.passed} Pcs</td>
                    <td className="p-3 text-center font-semibold text-red-600">
                      {qc.defects > 0 ? (
                        <>
                          {qc.defects} Pcs
                          <span className="block text-[10.5px] font-medium text-slate-500">
                            {kept} kept in stock · {returned} returned
                          </span>
                        </>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {stockPieces} Pcs
                      {totals.garmentsTotal !== stockPieces && (
                        <span className="block text-[10.5px] font-medium text-slate-500">of {totals.garmentsTotal} received</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-800">
              <tr>
                <td className="p-3">Total Inward Stock</td>
                <td className="p-3 text-center text-emerald-700">{grandSets} Sets</td>
                <td className="p-3 text-center text-emerald-700">{grandSemi} Sets</td>
                <td className="p-3 text-center text-emerald-700">{grandLoose} Pcs</td>
                <td className="p-3 text-center text-emerald-700">{grandPassed} Pcs</td>
                <td className="p-3 text-center text-red-600">{grandDefects} Pcs</td>
                <td className="p-3 text-right text-base text-slate-900">{grandStock} Pieces</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Inward Ledger</span>
          <span className="text-xs font-semibold text-slate-500">
            Challan: {challanNo || "—"} · Issued: {issuedChallanNo || "—"} · Sr. {nextSerial ?? "…"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
          <div>
            <span className="block text-slate-500">Approved Pieces</span>
            <span className="font-mono text-[22px] font-extrabold text-emerald-700">{grandPassed}</span>
            <span className="block text-[11.5px] text-slate-500">Passed QC (A-grade)</span>
          </div>
          <div>
            <span className="block text-slate-500">Defective Pieces</span>
            <span className={`font-mono text-[22px] font-extrabold ${grandDefects ? "text-red-600" : "text-slate-900"}`}>{grandDefects}</span>
            <span className="block text-[11.5px] text-slate-500">
              {grandDefects ? `${grandKept} kept in stock · ${grandReturned} returned to jobber` : "No defects"}
            </span>
          </div>
          <div className="md:text-right">
            <span className="block text-slate-500">Total Received Pieces</span>
            <span className="font-mono text-[22px] font-extrabold text-slate-900">{grandReceived}</span>
            <span className="block text-[11.5px] text-slate-500">
              {grandReturned ? `${grandStock} in stock after ${grandReturned} returned` : "All in stock"}
            </span>
          </div>
        </div>
      </div>

      {grandReturned > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-500" />
          <span>
            Returned pieces go back to the jobber and are not added to stock. They are recorded on the challan only, so no write-off is needed later.
          </span>
        </div>
      )}
    </div>
  );
};

export default SummaryStep;

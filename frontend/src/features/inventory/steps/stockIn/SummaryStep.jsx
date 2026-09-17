import { AlertCircle } from "lucide-react";

import { getVariantKey } from "../../utils/variantKey";
import { getVariantDisplayCode } from "../../utils/variantDisplay";

const formatInr = (amount) => `₹ ${Number(amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const SummaryStep = ({ selectedVariants, variantTotals, qcByKey, defectAction, sellingPricePerPiece, challanNo }) => {
  const rows = selectedVariants.map((variant) => {
    const key = getVariantKey(variant);
    const totals = variantTotals[key] ?? { setsTotal: 0, looseTotal: 0 };
    const qc = qcByKey[key] ?? { passed: 0, defects: 0 };
    return { key, variant, totals, qc };
  });

  const grandSets = rows.reduce((sum, row) => sum + row.totals.setsTotal, 0);
  const grandLoose = rows.reduce((sum, row) => sum + row.totals.looseTotal, 0);
  const grandPassed = rows.reduce((sum, row) => sum + (Number(row.qc.passed) || 0), 0);
  const grandDefects = rows.reduce((sum, row) => sum + (Number(row.qc.defects) || 0), 0);

  const totalApprovedValue = grandPassed * sellingPricePerPiece;
  const deductions = defectAction === "return" ? grandDefects * sellingPricePerPiece : 0;
  const netCredit = totalApprovedValue - deductions;

  const totalTagCount = grandSets + grandPassed;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-900">Final Goods Inward Summary</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="p-3">Variant Name</th>
                <th className="p-3 text-center">Full Sets Inward</th>
                <th className="p-3 text-center">Loose Pcs</th>
                <th className="p-3 text-center">QC Passed</th>
                <th className="p-3 text-center">Defect / Return</th>
                <th className="p-3 text-right">Billable Garments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ key, variant, totals, qc }) => (
                <tr key={key}>
                  <td className="flex items-center space-x-2 p-3 font-semibold text-slate-800">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
                    <span>
                      {variant.colorName} ({getVariantDisplayCode(variant)})
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold">{totals.setsTotal} Sets</td>
                  <td className="p-3 text-center">{totals.looseTotal} Pcs</td>
                  <td className="p-3 text-center font-semibold text-emerald-700">{qc.passed} Pcs</td>
                  <td className="p-3 text-center font-semibold text-red-600">
                    {qc.defects > 0 ? `${qc.defects} Pcs (${defectAction === "return" ? "Returned" : "Seconds"})` : "0"}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">{qc.passed} Pcs</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-800">
              <tr>
                <td className="p-3">Total Inward Stock</td>
                <td className="p-3 text-center text-emerald-700">{grandSets} Sets</td>
                <td className="p-3 text-center text-emerald-700">{grandLoose} Pcs</td>
                <td className="p-3 text-center text-emerald-700">{grandPassed} Pcs</td>
                <td className="p-3 text-center text-red-600">{grandDefects} Pcs</td>
                <td className="p-3 text-right text-base text-slate-900">{grandPassed} Pieces</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Inward Value Ledger</span>
          <span className="text-xs font-semibold text-slate-500">Challan: {challanNo || "—"}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
          <div>
            <span className="block text-slate-500">Total Approved Value</span>
            <span className="text-sm font-bold text-slate-900">
              {grandPassed} Pcs @ {formatInr(sellingPricePerPiece)}/pc
            </span>
          </div>
          <div>
            <span className="block text-slate-500">Deductions ({grandDefects} Defect {defectAction === "return" ? "Returned" : "Retained"})</span>
            <span className="text-sm font-bold text-red-600">- {formatInr(deductions)}</span>
          </div>
          <div className="md:text-right">
            <span className="block text-slate-500">Net Credit Amount</span>
            <span className="text-lg font-black text-emerald-700">{formatInr(netCredit)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-500">
        <AlertCircle className="size-4 shrink-0 text-amber-600" />
        <span>
          Upon clicking <strong>Confirm Inward &amp; Print Labels</strong>, {grandSets} Parent Set QRs and {grandPassed} Child
          Piece tags ({totalTagCount} total) will be spooled to the printer, and stock will be registered against
          current inventory.
        </span>
      </div>
    </div>
  );
};

export default SummaryStep;

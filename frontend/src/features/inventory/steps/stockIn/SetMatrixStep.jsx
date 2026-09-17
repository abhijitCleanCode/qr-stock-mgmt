import { Shirt } from "lucide-react";

import { getVariantKey } from "../../utils/variantKey";
import SetMatrixVariantCard from "./SetMatrixVariantCard";

const SetMatrixStep = ({
  selectedVariants,
  configs,
  onSetTotalSetsReceived,
  onSetLoosePieces,
  onAddBundle,
  onUpdateBundle,
  onRemoveBundle,
  variantTotals,
  onVariantTotalsChange,
  sellingPricePerPiece,
}) => {
  const primaryVariant = selectedVariants[0];

  const totalsList = Object.values(variantTotals);
  const grandSets = totalsList.reduce((sum, item) => sum + item.setsTotal, 0);
  const grandLoose = totalsList.reduce((sum, item) => sum + item.looseTotal, 0);
  const grandBundles = totalsList.reduce((sum, item) => sum + (item.bundlesTotal || 0), 0);
  const grandGarments = totalsList.reduce((sum, item) => sum + item.garmentsTotal, 0);
  const piecesPerSet = totalsList[0]?.piecesPerSet ?? 0;
  const sizeLabels = totalsList[0]?.sizeLabels ?? [];

  if (selectedVariants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No variants added yet. Go back to Inward Details and search for a design to add colour variants.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-200">
            <div className="text-center">
              <Shirt className="mx-auto size-6 text-slate-400" />
              <span className="text-[9px] font-medium text-slate-500">{primaryVariant?.designCode}</span>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {primaryVariant?.designName} ({primaryVariant?.designCode})
              </h3>
              {piecesPerSet > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {piecesPerSet}-Piece Set{sizeLabels.length > 0 ? `: ${sizeLabels.join(", ")}` : ""}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Enter completed bundles and individual loose garments received.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[11px] text-slate-500">Selling Price Base</span>
          <span className="text-xs font-bold text-slate-800">
            ₹{sellingPricePerPiece.toFixed(2)} / Pc (₹{(sellingPricePerPiece * piecesPerSet).toFixed(2)} / Set)
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {selectedVariants.map((variant, index) => {
          const key = getVariantKey(variant);
          const config = configs[key];
          if (!config) return null;

          return (
            <SetMatrixVariantCard
              key={key}
              index={index}
              variant={variant}
              config={config}
              onSetTotalSetsReceived={onSetTotalSetsReceived}
              onSetLoosePieces={onSetLoosePieces}
              onAddBundle={onAddBundle}
              onUpdateBundle={onUpdateBundle}
              onRemoveBundle={onRemoveBundle}
              onTotalsChange={onVariantTotalsChange}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="block font-medium text-emerald-700">Total Complete Sets:</span>
            <span className="text-base font-bold text-emerald-900">{grandSets} Sets</span>
          </div>
          <div className="border-l border-emerald-200 pl-6">
            <span className="block font-medium text-emerald-700">Total Loose Pieces:</span>
            <span className="text-base font-bold text-emerald-900">{grandLoose} Pcs</span>
          </div>
          <div className="border-l border-emerald-200 pl-6">
            <span className="block font-medium text-emerald-700">Combined Total Garments:</span>
            <span className="text-base font-bold text-emerald-900">{grandGarments} Pcs</span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800">
          Formula: {totalsList.map((item) => `(${item.setsTotal} × ${item.piecesPerSet})`).join(" + ") || "0"} + {grandLoose} Loose + {grandBundles} Semi Set Pcs = {grandGarments} Pcs
        </div>
      </div>
    </div>
  );
};

export default SetMatrixStep;

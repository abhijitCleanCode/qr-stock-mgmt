import { FileCheck, Info, Loader2Icon, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import DesignSearchInput from "../../components/DesignSearchInput";
import JobberSelect from "../../components/stock-in/JobberSelect";
import { useColorVariantSizesApi } from "../../hooks/useColorVariantSizesApi";
import { getVariantKey } from "../../utils/variantKey";

const JWO_INPUT_CLASSNAME =
  "h-[42px] rounded-lg border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-[3px] focus-within:ring-emerald-500/10 **:data-[slot=input-group-control]:pl-9 **:data-[slot=input-group-control]:text-sm";

const formatInr = (amount) => `₹ ${Number(amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const InwardDetailsStep = ({
  jobber,
  onJobberChange,
  challanNo,
  onChallanNoChange,
  challanDate,
  onChallanDateChange,
  selectedVariants,
  onAddVariant,
  onRemoveVariant,
  sellingPricePerPiece,
}) => {
  const primaryVariant = selectedVariants[0];
  const { data: sizesResponse, isFetching: isFetchingSizes } = useColorVariantSizesApi({
    colorVariantId: primaryVariant?.colorVariantId,
  });
  const sizes = sizesResponse?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-800" htmlFor="jobberSelect">
            Jobber Name
          </label>
          <JobberSelect id="jobberSelect" value={jobber?.name} onChange={onJobberChange} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-800" htmlFor="design-search">
            Design id
          </label>
          <div className="relative">
            <FileCheck className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
            <DesignSearchInput
              id="design-search"
              placeholder="Search by design code or name..."
              onSelect={onAddVariant}
              inputClassName={JWO_INPUT_CLASSNAME}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-800" htmlFor="challanNo">
            Jobber Delivery Challan No. 
          </label>
          <Input
            id="challanNo"
            placeholder="e.g. DC-2026/9021"
            value={challanNo}
            onChange={(event) => onChallanNoChange(event.target.value)}
            className="h-[42px] rounded-lg border-slate-200 bg-white text-sm focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-800" htmlFor="challanDate">
            Challan / Inward Date 
          </label>
          <Input
            id="challanDate"
            type="date"
            value={challanDate}
            onChange={(event) => onChallanDateChange(event.target.value)}
            className="h-[42px] rounded-lg border-slate-200 bg-white text-sm focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
          />
        </div>
      </div>

      {selectedVariants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVariants.map((variant) => (
            <span
              key={getVariantKey(variant)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pr-1.5 pl-2.5 text-xs font-medium text-slate-700"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
              {variant.designCode ? `${variant.designCode} · ` : ""}
              {variant.colorName}
              <button
                type="button"
                onClick={() => onRemoveVariant(variant)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={`Remove ${variant.colorName}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Auto-Populated Banner Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Fetched Design Identity</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            {isFetchingSizes && primaryVariant ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2Icon className="size-3 animate-spin" /> Loading...
              </span>
            ) : sizes.length > 0 ? (
              `${sizes.length}-Piece Set Design`
            ) : (
              "No Design Selected"
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <span className="block text-slate-500">Design Code</span>
            <span className="text-sm font-bold text-slate-800">{primaryVariant?.designCode ?? "—"}</span>
          </div>
          <div>
            <span className="block text-slate-500">Garment Pattern</span>
            <span className="font-semibold text-slate-800">{primaryVariant?.designName ?? "—"}</span>
          </div>
          <div>
            <span className="block text-slate-500">Fabric Quality</span>
            <span className="font-semibold text-slate-800">{primaryVariant?.designQuality ?? "—"}</span>
          </div>
          <div>
            <span className="block text-slate-500">Selling Price / Pc</span>
            <span className="text-sm font-bold text-emerald-700">{formatInr(sellingPricePerPiece)} / Pc</span>
          </div>
        </div>
      </div>

      {/* <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-800">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <span>
          Search and add every colour variant received against this job work — each pulls its registered set
          composition and active sizes straight from Design Master. Add as many variants as the challan covers before
          moving to Set Matrix.
        </span>
      </div> */}
    </div>
  );
};

export default InwardDetailsStep;

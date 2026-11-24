import { ImageIcon, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

// One design on the Design Master dashboard: first variant's photo, colour swatches, identity,
// set composition, price, and the Edit / Show Design Details actions. On phones the photo sits
// beside the text, so a card takes about a third of the height it does on a larger screen.
const DesignCard = ({ design, onEdit, onShowDetails }) => {
  const variants = design.colorVariants ?? [];
  const hero = variants[0]?.imageUrl;
  // Shown in capitals so every design reads the same way, including older entries.
  const meta = [design.name, design.quality, design.jobberName].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-row overflow-hidden rounded-[15px] border border-slate-200 bg-white sm:flex-col">
      <div className="relative w-[38%] shrink-0 overflow-hidden bg-slate-100 sm:aspect-[4/3] sm:w-full">
        {hero ? (
          <img src={hero} alt={`${design.code ?? design.itemName} ${variants[0].colorName}`} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-slate-400">
            <ImageIcon className="size-8" />
          </div>
        )}
        {variants.length > 0 && (
          // White pill behind the swatches, so light and dark colours both stand out on any photo.
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 p-1 shadow-[0_1px_4px_rgba(15,23,42,0.35)]">
            {variants.slice(0, 4).map((variant) => (
              <span
                key={variant.id}
                title={variant.colorName}
                className="size-4 rounded-full ring-1 ring-inset ring-slate-900/20"
                style={{ backgroundColor: variant.colorHex }}
              />
            ))}
            {variants.length > 4 && (
              <span className="grid size-4 place-items-center rounded-full bg-slate-900/80 text-[8.5px] font-bold text-white">
                +{variants.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-3 sm:px-4 sm:pb-4 sm:pt-3.5">
        <div className="truncate font-mono text-[13px] font-bold uppercase text-slate-900">{design.code || "No code"}</div>
        <div className="truncate text-[12.6px] uppercase text-slate-500">{design.itemName || design.name}</div>
        {meta && <div className="text-[11.6px] uppercase text-slate-400">{meta}</div>}
        {design.setComposition?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {design.setComposition.map((size) => (
              <span key={size.id} className="rounded-[5px] border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                {size.sizeLabel}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2.5 pt-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13.5px] font-bold text-slate-900">
              ₹{inr.format(design.defaultSellingPricePerPiece ?? 0)}
              <span className="text-[10.5px] font-medium text-slate-400">/pc</span>
            </span>
            <button
              type="button"
              onClick={() => onEdit(design)}
              title="Edit design"
              aria-label={`Edit ${design.code ?? design.itemName}`}
              className="grid size-[30px] place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onShowDetails(design)}
            className="w-full gap-1.5 rounded-full text-xs font-semibold transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <ImageIcon className="size-3.5" /> Show Design Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DesignCard;

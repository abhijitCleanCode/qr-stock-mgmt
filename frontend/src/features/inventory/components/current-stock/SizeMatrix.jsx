import { cn } from "@/lib/utils";
import { groupByDesign } from "../../utils/currentStock";

// Standard size order. Any other size label in the data is appended after these.
const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const sizeColumns = (variants) => {
  const seen = new Set(variants.flatMap((variant) => variant.sizes.map((size) => size.size)));
  return [...STANDARD_SIZES, ...[...seen].filter((label) => !STANDARD_SIZES.includes(label))];
};

const TH = "sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono text-[11px] font-bold text-slate-500";

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 px-4 py-3 text-[12px] text-slate-500">
    <span className="inline-flex items-center gap-2">
      <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[12px] font-bold text-red-700">0</span>
      a size has run out while the colour still has stock
    </span>
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-[14px] text-slate-300">·</span>
      size not made
    </span>
  </div>
);

const SizeMatrix = ({ variants, onOpen }) => {
  const groups = groupByDesign(variants);
  const columns = sizeColumns(variants);

  if (groups.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        <b className="mb-1 block text-[15px] text-slate-900">Nothing matches</b>
        Try another search, or clear the filters.
      </div>
    );
  }

  // Column totals across every colour shown, so the footer matches the rows above it.
  const columnTotals = Object.fromEntries(columns.map((label) => [label, 0]));
  let grandTotal = 0;
  const rows = groups.flatMap((group) => group.variants);
  rows.forEach((variant) => {
    grandTotal += variant.totalPieces;
    variant.sizes.forEach((size) => {
      columnTotals[size.size] += size.quantity;
    });
  });

  return (
    <div className="overflow-hidden rounded-[13px] border border-slate-200">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className={cn(TH, "sticky left-0 z-30 min-w-[220px] text-left font-sans text-[10px] uppercase tracking-[0.07em]")}>
                Design · colour
              </th>
              {columns.map((label) => (
                <th key={label} className={TH}>{label}</th>
              ))}
              <th className={cn(TH, "border-l")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((variant) => {
              const bySize = new Map(variant.sizes.map((size) => [size.size, size.quantity]));
              const outOfStock = variant.totalPieces === 0;
              return (
                <tr
                  key={variant.colorVariantId}
                  onClick={() => onOpen(variant.colorVariantId)}
                  title="Open colour details"
                  className="group cursor-pointer hover:bg-slate-50"
                >
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2.5 group-hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-[22px] flex-none rounded-md ring-1 ring-slate-200"
                        style={{ backgroundColor: variant.colorHex || "#CBD5E1" }}
                      />
                      <span className="font-mono font-bold whitespace-nowrap text-slate-900">
                        {variant.design.code} <span className="text-slate-400">·</span> {variant.colorName}
                      </span>
                    </div>
                  </td>
                  {outOfStock ? (
                    <td colSpan={columns.length} className="border-b border-slate-100 px-3 py-2.5 text-left text-[12.5px] italic text-slate-400">
                      Out of stock
                    </td>
                  ) : (
                    columns.map((label) => {
                      if (!bySize.has(label)) {
                        return (
                          <td key={label} className="border-b border-slate-100 px-3 py-2.5 text-center font-mono text-[14px] text-slate-300">
                            ·
                          </td>
                        );
                      }
                      const quantity = bySize.get(label);
                      return (
                        <td key={label} className="border-b border-slate-100 px-3 py-2.5 text-center">
                          {quantity === 0 ? (
                            <span className="inline-block min-w-[34px] rounded-md bg-red-50 px-1.5 py-0.5 font-mono font-bold text-red-700">0</span>
                          ) : (
                            <span className="font-mono font-semibold text-slate-700">{quantity}</span>
                          )}
                        </td>
                      );
                    })
                  )}
                  <td className="border-b border-l border-slate-100 px-3 py-2.5 text-center font-mono font-bold text-slate-900">{variant.totalPieces}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-mono font-bold text-slate-900">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left font-sans text-[12.5px]">Total</td>
              {columns.map((label) => (
                <td key={label} className="px-3 py-2.5 text-center">{columnTotals[label]}</td>
              ))}
              <td className="border-l px-3 py-2.5 text-center">{grandTotal}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Legend />
    </div>
  );
};

export default SizeMatrix;

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FACETS, STOCK_OPTIONS, activeChips, facetOptions, freshFilters } from "../../utils/galleryFilters.js";
import FacetPopover from "./FacetPopover.jsx";

// Search, the facet buttons, the stock toggle (All designs only), a "12 of 40" count and the
// removable chips. Works the same over the whole catalogue or one fetched order form / invoice.
const GalleryFilters = ({ items, filters, onChange, mode, matches, visibleCount }) => {
    const set = (patch) => onChange({ ...filters, ...patch });
    const chips = activeChips(items, filters, mode);

    const removeChip = (chip) => {
        if (chip.kind === "facet") set({ [chip.facetId]: filters[chip.facetId].filter((value) => value !== chip.value) });
        else if (chip.kind === "search") set({ q: "" });
        else set({ stock: "all" });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="neu-pressed relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                <input
                    value={filters.q}
                    onChange={(event) => set({ q: event.target.value })}
                    autoComplete="off"
                    placeholder="Search by design code, item name, pattern, quality or colour"
                    className="w-full border-none bg-transparent py-2 pl-12 pr-4 text-sm font-medium outline-none placeholder:text-gray-500"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {FACETS.map((facet) => (
                    <FacetPopover
                        key={facet.id}
                        facet={facet}
                        options={facetOptions(items, filters, facet.id, matches)}
                        selected={filters[facet.id]}
                        onChange={(values) => set({ [facet.id]: values })}
                    />
                ))}

                {mode === "all" && (
                    <div className="toolbar-neu flex gap-1 rounded-xl p-1">
                        {STOCK_OPTIONS.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => set({ stock: key })}
                                className={cn(
                                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                                    filters.stock === key ? "bg-white text-[#1E1B4B] shadow-sm" : "text-[#1E1B4B]/60 hover:text-[#1E1B4B]",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <span className="ml-auto text-xs text-[#1E1B4B]/55">
                    {visibleCount} of {items.length} variant{items.length === 1 ? "" : "s"}
                </span>
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                        <span
                            key={`${chip.kind}-${chip.facetId ?? ""}-${chip.value ?? ""}`}
                            className="flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-medium text-[#00694C]"
                        >
                            {chip.label}
                            <button
                                type="button"
                                onClick={() => removeChip(chip)}
                                aria-label={`Remove filter ${chip.label}`}
                                className="rounded-full p-0.5 hover:bg-emerald-100"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={() => onChange(freshFilters())}
                        className="text-xs font-semibold text-[#1E1B4B]/60 hover:underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};

export default GalleryFilters;

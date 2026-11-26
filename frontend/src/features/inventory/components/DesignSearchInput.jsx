import { useMemo, useState } from "react";
import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useDesignSearchApi, MIN_DESIGN_SEARCH_LENGTH } from "../hooks/useDesignSearchApi";
import { getVariantKey } from "../utils/variantKey";

const SEARCH_DEBOUNCE_MS = 250;

const flattenToVariantItems = (designs) =>
  designs.flatMap((design) =>
    (design.colorVariants ?? []).map((variant) => ({
      designId: design.id,
      colorVariantId: variant.id,
      designCode: design.code,
      designName: design.name,
      designQuality: design.quality,
      designItemName: design.itemName,
      jobberId: design.jobberId,
      jobberName: design.jobberName,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      imageUrl: variant.imageUrl,
      sellingPricePerPiece: design.defaultSellingPricePerPiece,
    }))
  );

const groupByDesign = (items) => {
  const groups = new Map();

  for (const item of items) {
    if (!groups.has(item.designId)) {
      groups.set(item.designId, {
        designId: item.designId,
        designCode: item.designCode,
        designName: item.designName,
        sellingPricePerPiece: item.sellingPricePerPiece,
        variants: [],
      });
    }
    groups.get(item.designId).variants.push(item);
  }

  return [...groups.values()];
};

const getVariantLabel = (item) =>
  `${item.designCode ? `${item.designCode} · ` : ""}${item.designName} — ${item.colorName}`;

const isSameVariant = (item, other) =>
  item?.designId === other?.designId && item?.colorVariantId === other?.colorVariantId;

const DEFAULT_INPUT_CLASSNAME =
  "neu-pressed h-10 rounded-full border-none bg-transparent shadow-none **:data-[slot=input-group-control]:pl-9";

// Picking a variant keeps the popup open with the same search text, so every colour of a set
// can be added in one go. The popup closes only on an outside click, Escape, or the clear button.
const DesignSearchInput = ({
  onSelect,
  onRemove,
  selectedVariants = [],
  placeholder = "Search by design code or name...",
  disabled = false,
  id,
  inputClassName = DEFAULT_INPUT_CLASSNAME,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedKeys = useMemo(() => new Set(selectedVariants.map(getVariantKey)), [selectedVariants]);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const keyword = debouncedQuery.trim();
  const shouldSearch = keyword.length >= MIN_DESIGN_SEARCH_LENGTH;

  const { data: response, isFetching, isError } = useDesignSearchApi({ keyword });
  const designs = useMemo(() => response?.data ?? [], [response]);

  const variantItems = useMemo(() => flattenToVariantItems(designs), [designs]);
  const groups = useMemo(() => groupByDesign(variantItems), [variantItems]);

  // The value is always cleared, so picking the same variant again still fires onValueChange.
  // Picking an already-added variant toggles it off.
  const handleValueChange = (item) => {
    if (!item) return;
    const key = getVariantKey(item);
    if (selectedKeys.has(key)) {
      onRemove?.(item);
      return;
    }
    onSelect?.(item);
    // Once every colour of this design is in the set, the design is complete: close the popup.
    const designComplete = variantItems
      .filter((variant) => variant.designId === item.designId)
      .every((variant) => variant.colorVariantId === item.colorVariantId || selectedKeys.has(getVariantKey(variant)));
    if (designComplete) setOpen(false);
  };

  // Base UI fills the input with the picked item's label; keep the search text instead.
  const handleInputValueChange = (value, details) => {
    if (details?.reason === "item-press") return;
    setQuery(value);
  };

  // Ignore the close that Base UI triggers on item press; the popup stays open for more picks.
  const handleOpenChange = (nextOpen, details) => {
    if (!nextOpen && details?.reason === "item-press") return;
    setOpen(nextOpen);
  };

  return (
    <Combobox
      items={variantItems}
      filter={null}
      open={open}
      onOpenChange={handleOpenChange}
      value={null}
      inputValue={query}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
      itemToStringLabel={getVariantLabel}
      isItemEqualToValue={isSameVariant}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        showTrigger={false}
        showClear
        className={inputClassName}
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      </ComboboxInput>

      <ComboboxContent className="mt-2 min-w-(--anchor-width) rounded-xl border border-slate-200 bg-white p-0 shadow-lg shadow-slate-900/10 ring-0">
        <ComboboxList className="max-h-[min(24rem,var(--available-height))] space-y-2 overflow-y-auto p-2">
          <ComboboxEmpty>
            {!shouldSearch && (
              <span className="inline-flex items-center gap-2">
                <SearchIcon className="size-4" />
                Type at least {MIN_DESIGN_SEARCH_LENGTH} characters to search designs.
              </span>
            )}
            {shouldSearch && isFetching && (
              <span className="inline-flex items-center gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                Searching designs...
              </span>
            )}
            {shouldSearch && !isFetching && isError && "Failed to search designs. Please try again."}
            {shouldSearch && !isFetching && !isError && `No designs found for "${keyword}".`}
          </ComboboxEmpty>

          {groups.map((group) => (
            <ComboboxGroup
              key={group.designId}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            >
              <ComboboxLabel className="min-w-0 p-0 pb-2 text-sm font-bold text-slate-900">
                <span className="block truncate">
                  {group.designCode ? `${group.designCode} · ` : ""}
                  {group.designName}
                </span>
              </ComboboxLabel>

              <div className="flex flex-wrap gap-2">
                {group.variants.map((item) => {
                  const isSelected = selectedKeys.has(getVariantKey(item));
                  return (
                    <ComboboxItem
                      key={item.colorVariantId}
                      value={item}
                      className={cn(
                        "w-auto shrink-0 gap-1.5 rounded-full border py-1.5 pr-7 pl-2.5 text-sm font-medium shadow-sm transition-colors data-highlighted:border-emerald-300 data-highlighted:bg-emerald-50 data-highlighted:text-emerald-900",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100",
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      {item.colorName}
                      {isSelected && <CheckIcon className="size-3.5 text-emerald-600" />}
                    </ComboboxItem>
                  );
                })}
              </div>
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default DesignSearchInput;

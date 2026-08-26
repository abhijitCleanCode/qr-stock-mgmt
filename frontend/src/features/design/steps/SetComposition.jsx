import { Fragment, useState } from "react";
import { Controller } from "react-hook-form";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

const SetComposition = ({ control }) => {
  const [customSizes, setCustomSizes] = useState([]);
  const [isAddingCustomSize, setIsAddingCustomSize] = useState(false);
  const [customSizeValue, setCustomSizeValue] = useState("");

  const allSizes = [...DEFAULT_SIZES, ...customSizes];

  return (
    <Controller
      control={control}
      name="sizes"
      defaultValue={[]}
      render={({ field }) => {
        const selectedSizes = field.value ?? [];

        const toggleSize = (size) => {
          field.onChange(
            selectedSizes.includes(size)
              ? selectedSizes.filter((s) => s !== size)
              : [...selectedSizes, size]
          );
        };

        const cancelCustomSize = () => {
          setIsAddingCustomSize(false);
          setCustomSizeValue("");
        };

        const addCustomSize = () => {
          const size = customSizeValue.trim().toUpperCase();

          if (!size || allSizes.includes(size)) {
            cancelCustomSize();
            return;
          }

          setCustomSizes((prev) => [...prev, size]);
          field.onChange([...selectedSizes, size]);
          cancelCustomSize();
        };

        return (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Select Sizes for This Set</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {allSizes.map((size) => {
                const isSelected = selectedSizes.includes(size);

                return (
                  <Button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-full neu-button border px-4 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-[#00694C]! bg-[#00694C]! text-[#ffffff]"
                        : "border-transparent! text-muted-foreground hover:bg-muted/70!"
                    )}
                  >
                    {isSelected && <Check className="size-3.5" />}
                    {size}
                  </Button>
                );
              })}

              {isAddingCustomSize ? (
                <div className="flex items-center gap-1.5">
                  <div className="neu-pressed flex h-10 items-center rounded-full px-1">
                    <Input
                      autoFocus
                      value={customSizeValue}
                      onChange={(e) => setCustomSizeValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSize();
                        }

                        if (e.key === "Escape") {
                          cancelCustomSize();
                        }
                      }}
                      onBlur={() => {
                        if (!customSizeValue.trim()) cancelCustomSize();
                      }}
                      placeholder="e.g. 3XL"
                      className="h-8 w-20 rounded-full border-none bg-transparent text-center shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCustomSize}
                    className="neu-icon-button text-[#1E1B4B]"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsAddingCustomSize(true)}
                  className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors"
                >
                  <Plus className="size-3.5" />
                  Other
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-[#00694C]/20 bg-[#00694C]/5 p-4">
              {selectedSizes.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {selectedSizes.map((size, index) => (
                      <Fragment key={size}>
                        {index > 0 && (
                          <span className="text-sm font-medium text-muted-foreground">+</span>
                        )}
                        <Badge className="rounded-md bg-[#00694C] px-2.5 py-2.5 text-sm font-semibold text-white">
                          {size}
                        </Badge>
                      </Fragment>
                    ))}
                  </div>

                  <p className="mt-3 text-center text-sm text-foreground">
                    1 complete set = {selectedSizes.length} pieces (
                    {selectedSizes.join(" + ")} × 1 each)
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Select at least one size to see the set summary
                </p>
              )}
            </div>
          </div>
        );
      }}
    />
  );
};

export default SetComposition;

import { useMemo, useState } from "react";

import ActionModal from "@/components/shared/ActionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SizeQuantityGrid from "../../components/SizeQuantityGrid";
import { getBundlePiecesPerBundle } from "../../utils/stockCalculations";

const buildInitialComposition = (sizes) => Object.fromEntries(sizes.map((size) => [size.id, 0]));

// Lets the user define a Semi Set on the fly, for this Stock Inwarding transaction only —
// no Design Master record is created or touched. Composition/label are handed back through
// onSubmit exactly like a Design Master semi set would (see handleAddSemiSet in
// SetMatrixVariantCard), so downstream totals/payload building don't need to know the
// difference between the two origins.
const AddCustomSemiSetDialog = ({ sizes, onSubmit, onClose }) => {
  const [open, setOpen] = useState(true);
  const [label, setLabel] = useState("");
  const [composition, setComposition] = useState(() => buildInitialComposition(sizes));

  const piecesPerSet = useMemo(() => getBundlePiecesPerBundle(composition), [composition]);
  const isValid = piecesPerSet > 0;

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setTimeout(onClose, 150);
    }
  };

  const handleCompositionChange = (sizeId, value) => {
    setComposition((prev) => ({ ...prev, [sizeId]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;

    onSubmit({ quantity: 1, composition, label: label.trim() || "Semi Set" });
    handleOpenChange(false);
  };

  return (
    <ActionModal openActionModal={open} setOpenActionModal={handleOpenChange} title="Add Semi Set">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Semi Set name (optional)</span>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder='e.g. "3-pc: S/M/L"'
            className="h-11"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Sizes in this Semi Set</span>
          {sizes.length > 0 ? (
            <SizeQuantityGrid sizes={sizes} values={composition} onChange={handleCompositionChange} />
          ) : (
            <p className="text-sm text-muted-foreground">No active sizes for this variant.</p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">{piecesPerSet} pcs / set</p>

        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" className="h-11 flex-1 bg-[#00694C]" disabled={!isValid}>
            Add Semi Set
          </Button>
        </div>
      </form>
    </ActionModal>
  );
};

export default AddCustomSemiSetDialog;

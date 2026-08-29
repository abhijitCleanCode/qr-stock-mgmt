import { Badge } from "@/components/ui/badge";

// One distinct stock-group composition currently held by this variant — count, recipe (as size×qty
// chips), and the physical pieces it represents. All values come straight from the detail API's
// `compositions[]`; only the "Composition 0N" ordinal is a frontend-assigned display label.
const BundleCompositionCard = ({ index, composition }) => {
  const { bundleCount, composition: pieces, piecesPerBundle, totalPieces } = composition;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Composition {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-xs text-muted-foreground">
          {bundleCount} bundle{bundleCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pieces.map((piece) => (
          <Badge key={piece.designSizeId} variant="outline">
            {piece.size} × {piece.quantity}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
        <span>{piecesPerBundle} pcs / bundle</span>
        <span className="font-medium text-foreground">{totalPieces} total pieces</span>
      </div>
    </div>
  );
};

export default BundleCompositionCard;

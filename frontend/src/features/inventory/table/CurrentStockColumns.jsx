import { Badge } from "@/components/ui/badge";
import CurrentStockRowActions from "../components/CurrentStockRowActions";

const STATUS_LABELS = {
  IN_STOCK: "In Stock",
  OUT_OF_STOCK: "Out of Stock",
};

const STATUS_BADGE_VARIANT = {
  IN_STOCK: "secondary",
  OUT_OF_STOCK: "destructive",
};

export const columns = [
  {
    id: "design",
    header: "Design",
    cell: ({ row }) => {
      const { designCode, designName, imageUrl } = row.original;

      return (
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {imageUrl && (
              <img src={imageUrl} alt={designName} className="h-full w-full object-cover" />
            )}
          </div>
          <span className="truncate text-sm font-medium text-foreground">
            {designCode ? `${designCode} · ` : ""}
            {designName}
          </span>
        </div>
      );
    },
  },
  {
    id: "variant",
    header: "Variant",
    cell: ({ row }) => {
      const { colorName, colorHex } = row.original;

      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          <span
            className="size-2.5 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: colorHex }}
          />
          {colorName}
        </span>
      );
    },
  },
  { accessorKey: "totalPieces", header: "Total Pieces" },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const { status } = row.original;

      return (
        <Badge variant={STATUS_BADGE_VARIANT[status] ?? "outline"}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <CurrentStockRowActions colorVariantId={row.original.colorVariantId} />,
  },
];

const formatInr = (amount) => `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;

const quantityLabel = (item) => (item.type === "SET" ? `${item.quantity} Sets` : `${item.quantity} Pcs`);

// "S: 5, M: 5, L: 5, XL: 5" — every active size for the variant, in display order, even the
// ones at 0 (e.g. a loose-piece row that only touched two of four sizes).
const sizeBreakdownLabel = (item) =>
  (item.sizeBreakdown ?? []).map((size) => `${size.sizeLabel}: ${size.quantity}`).join(", ");

export const columns = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.index + 1}</span>,
  },
  {
    id: "designVariant",
    header: "Design / Variant",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.imageUrl && <img src={item.imageUrl} alt={item.colorName} className="h-full w-full object-cover" />}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {item.designCode ? `${item.designCode} · ` : ""}{item.designName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.colorHex }} />
              {item.colorName}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "sizeBreakdown",
    header: "Size Breakdown",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{sizeBreakdownLabel(row.original)}</span>,
  },
  {
    id: "quantity",
    header: "Quantity",
    cell: ({ row }) => <span className="text-sm text-foreground">{quantityLabel(row.original)}</span>,
  },
  {
    id: "estimatedValue",
    header: "Est. Value",
    cell: ({ row }) => <span className="text-sm font-semibold text-foreground">{formatInr(row.original.estimatedValue)}</span>,
  },
];

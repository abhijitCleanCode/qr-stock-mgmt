// Right-aligns numeric text inside DataTable's own cell padding — DataTable doesn't expose
// per-column alignment, so alignment is controlled at the content level instead.
const numericCell = (value, emphasize) => (
  <span className={emphasize ? "block text-right font-semibold text-foreground tabular-nums" : "block text-right text-muted-foreground tabular-nums"}>
    {value}
  </span>
);

export const columns = [
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.size}</span>,
  },
  {
    accessorKey: "setPieces",
    header: "Set",
    cell: ({ row }) => numericCell(row.original.setPieces),
  },
  {
    accessorKey: "bundlePieces",
    header: "Bundle",
    cell: ({ row }) => numericCell(row.original.bundlePieces),
  },
  {
    accessorKey: "loosePieces",
    header: "Loose",
    cell: ({ row }) => numericCell(row.original.loosePieces),
  },
  {
    id: "totalPieces",
    header: "Total",
    cell: ({ row }) => numericCell(row.original.totalPieces, true),
  },
];

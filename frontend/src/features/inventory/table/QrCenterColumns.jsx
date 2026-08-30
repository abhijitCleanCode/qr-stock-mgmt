import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import QrStatusBadge from "../components/qr-center/QrStatusBadge";
import QrCenterRowActions from "../components/qr-center/QrCenterRowActions";

const TYPE_LABELS = {
  SET: "Set",
  BUNDLE: "Bundle",
};

// Factory (not a static array) because the Actions column's "print this one" action needs
// to reach the print state that QrCenter.jsx owns.
export const createQrCenterColumns = ({ onPrintOne }) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        aria-label="Select all on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label={`Select stock #${row.original.stockItemId}`}
      />
    ),
    enableSorting: false,
  },
  {
    id: "design",
    header: "Design",
    cell: ({ row }) => {
      const { designCode, designName, imageUrl } = row.original;

      return (
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {imageUrl && <img src={imageUrl} alt={designName} className="h-full w-full object-cover" />}
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
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>,
  },
  {
    id: "qrStatus",
    header: "QR Status",
    cell: ({ row }) => <QrStatusBadge hasQr={Boolean(row.original.qr)} />,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <QrCenterRowActions item={row.original} onPrintOne={onPrintOne} />,
  },
];

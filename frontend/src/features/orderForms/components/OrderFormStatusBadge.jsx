import { Badge } from "@/components/ui/badge";

const STATUS_LABELS = {
  DRAFT: "Draft",
  SHARED: "Shared",
  CONVERTED: "Converted",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANTS = {
  DRAFT: "secondary",
  SHARED: "default",
  CONVERTED: "outline",
  CANCELLED: "destructive",
};

const OrderFormStatusBadge = ({ status }) => (
  <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>{STATUS_LABELS[status] ?? status}</Badge>
);

export default OrderFormStatusBadge;

import { Badge } from "@/components/ui/badge";

const QrStatusBadge = ({ hasQr }) => (
  <Badge variant={hasQr ? "secondary" : "outline"}>{hasQr ? "QR Ready" : "Not Generated"}</Badge>
);

export default QrStatusBadge;

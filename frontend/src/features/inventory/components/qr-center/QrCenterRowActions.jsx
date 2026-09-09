import { EyeIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

// Navigates to the dedicated QR Grid page for this Stock Registration — same "row -> detail
// page, not a modal" pattern as CurrentStockRowActions (see App.jsx routes).
const QrCenterRowActions = ({ stockInTransactionId }) => {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="View QR codes"
      title="View QR codes"
      onClick={() => navigate(`/qr-center/${stockInTransactionId}`)}
    >
      <EyeIcon />
    </Button>
  );
};

export default QrCenterRowActions;

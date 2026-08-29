import { EyeIcon } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";

// Navigates to the dedicated Current Stock Detail page — superseded the earlier
// CurrentStockDetailDialog modal now that a full detail page exists (see App.jsx routes).
const CurrentStockRowActions = ({ colorVariantId }) => {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="View stock details"
      title="View stock details"
      onClick={() => navigate(`/current-stock/${colorVariantId}`)}
    >
      <EyeIcon />
    </Button>
  );
};

export default CurrentStockRowActions;

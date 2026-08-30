import { EyeIcon, Loader2Icon, QrCodeIcon } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { useModal } from "@/components/shared/ModalProvider";
import { useGenerateQrCodesApi } from "../../hooks/useGenerateQrCodesApi";
import QrPreviewDialog from "./QrPreviewDialog";

// Ineligible/not-yet-generated rows get a "Generate" action; a row that already has a QR
// gets a "View" action instead — generating again would just report ALREADY_EXISTS (see
// qrCenter.service.js), so there is never a "regenerate" affordance here.
const QrCenterRowActions = ({ item, onPrintOne }) => {
  const { openModal } = useModal();
  const generateQr = useGenerateQrCodesApi();

  const handleGenerate = () => {
    generateQr.mutate([item.stockItemId], {
      onSuccess: (response) => {
        const [result] = response.data.results;
        if (result?.status === "GENERATED") {
          toast.success(`QR generated for stock #${item.stockItemId}.`);
        } else {
          toast.info(`Stock #${item.stockItemId} already has a QR.`);
        }
      },
      onError: (error) => {
        toast.error(error?.message ?? "Couldn't generate QR. Please try again.");
      },
    });
  };

  if (!item.qr) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generateQr.isPending}>
        {generateQr.isPending ? <Loader2Icon className="animate-spin" /> : <QrCodeIcon />}
        Generate
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="View QR code"
      title="View QR code"
      onClick={() => openModal(QrPreviewDialog, { item, onPrint: () => onPrintOne(item) })}
    >
      <EyeIcon />
    </Button>
  );
};

export default QrCenterRowActions;

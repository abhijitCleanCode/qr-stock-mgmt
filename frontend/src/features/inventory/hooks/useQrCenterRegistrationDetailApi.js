import { useQuery } from "@tanstack/react-query";
import { getQrCenterRegistrationDetailApi } from "../services/qrCenter.api.js";

// Lazy by construction: `enabled` keeps this from firing until a stockInTransactionId is
// actually available — same pattern as useCurrentStockDetailApi.
export function useQrCenterRegistrationDetailApi(stockInTransactionId) {
    return useQuery({
        queryKey: ["qr-center", "registration", stockInTransactionId],
        queryFn: () => getQrCenterRegistrationDetailApi(stockInTransactionId),
        enabled: Boolean(stockInTransactionId),
    });
}

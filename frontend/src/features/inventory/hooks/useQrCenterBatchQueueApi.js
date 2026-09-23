import { useQuery } from "@tanstack/react-query";
import { getQrCenterBatchQueueApi } from "../services/qrCenterSearch.api.js";

export function useQrCenterBatchQueueApi(stockInTransactionId, { enabled = true } = {}) {
    return useQuery({
        queryKey: ["qr-center-batch-queue", stockInTransactionId],
        queryFn: () => getQrCenterBatchQueueApi(stockInTransactionId),
        enabled: enabled && !!stockInTransactionId,
    });
}

import { useQuery } from "@tanstack/react-query";
import { getQrBatchApi } from "../services/qrCenter.api.js";

// The tag list of one stock-in batch, for the Configure & print studio. Pass `qrIds` to load only
// the tags picked for a reprint. Always refetched on open: tags can have been printed or created
// from another screen since the list was loaded.
export function useQrBatchApi(batchId, { enabled = true, qrIds } = {}) {
    return useQuery({
        queryKey: ["qr-center", "batch", batchId, qrIds ?? null],
        queryFn: () => getQrBatchApi(batchId, qrIds),
        enabled: enabled && Boolean(batchId),
        staleTime: 0,
        gcTime: 0,
    });
}

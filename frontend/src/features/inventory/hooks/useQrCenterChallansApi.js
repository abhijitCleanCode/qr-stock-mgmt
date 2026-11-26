import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQrCenterChallansApi } from "../services/qrCenterSearch.api.js";

// Challans matching the reprint search, each with its whole set / semi set / loose counts.
export function useQrCenterChallansApi(params, { enabled = true } = {}) {
    return useQuery({
        queryKey: ["qr-center-challans", params],
        queryFn: () => getQrCenterChallansApi(params),
        enabled,
        placeholderData: keepPreviousData,
    });
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQrCenterToTagApi } from "../services/qrCenter.api.js";

export function useQrCenterToTagApi({ page = 1, limit = 20 } = {}) {
    return useQuery({
        queryKey: ["qr-center", "to-tag", { page, limit }],
        queryFn: () => getQrCenterToTagApi({ page, limit }),
        placeholderData: keepPreviousData,
    });
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQrCenterListApi } from "../services/qrCenter.api.js";

export function useQrCenterListApi({ page = 1, limit = 20, keyword } = {}) {
    return useQuery({
        queryKey: ["qr-center", { page, limit, keyword }],
        queryFn: () => getQrCenterListApi({ page, limit, keyword }),
        placeholderData: keepPreviousData,
    });
}

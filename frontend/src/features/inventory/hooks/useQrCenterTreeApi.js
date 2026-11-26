import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQrCenterTreeApi } from "../services/qrCenterSearch.api.js";

// The reprint picker's grouped list. Same filters as the flat search; the answer is not paged.
export function useQrCenterTreeApi(params, { enabled = true } = {}) {
    return useQuery({
        queryKey: ["qr-center-tree", params],
        queryFn: () => getQrCenterTreeApi(params),
        enabled,
        placeholderData: keepPreviousData,
    });
}

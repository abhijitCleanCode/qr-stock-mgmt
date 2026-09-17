import { useQuery } from "@tanstack/react-query";
import { getQrCenterReferenceApi } from "../services/qrCenter.api.js";

export function useQrCenterReferenceApi() {
    return useQuery({
        queryKey: ["qr-center", "reference"],
        queryFn: getQrCenterReferenceApi,
        staleTime: 5 * 60_000,
    });
}

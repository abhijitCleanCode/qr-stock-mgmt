import { useQuery } from "@tanstack/react-query";
import { getQrCenterHealthApi } from "../services/qrCenter.api.js";

export function useQrCenterHealthApi() {
    return useQuery({
        queryKey: ["qr-center", "health"],
        queryFn: getQrCenterHealthApi,
        staleTime: 30_000,
    });
}

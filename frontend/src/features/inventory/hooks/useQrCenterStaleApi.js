import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptStaleApi, getQrCenterStaleApi, reprintStaleApi } from "../services/qrCenter.api.js";

export function useQrCenterStaleApi() {
    return useQuery({
        queryKey: ["qr-center", "stale"],
        queryFn: getQrCenterStaleApi,
    });
}

export function useReprintStaleApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reprintStaleApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "stale"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "jobs"] });
        },
    });
}

export function useAcceptStaleApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: acceptStaleApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "stale"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
        },
    });
}

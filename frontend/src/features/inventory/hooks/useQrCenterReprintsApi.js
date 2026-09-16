import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    bulkPrintReprintsApi,
    createQrCenterReprintApi,
    getQrCenterReprintsApi,
} from "../services/qrCenter.api.js";

export function useQrCenterReprintsApi({ status = "PENDING", page = 1, limit = 50 } = {}) {
    return useQuery({
        queryKey: ["qr-center", "reprints", { status, page, limit }],
        queryFn: () => getQrCenterReprintsApi({ status, page, limit }),
        placeholderData: keepPreviousData,
    });
}

export function useCreateQrCenterReprintApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createQrCenterReprintApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "reprints"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
        },
    });
}

export function useBulkPrintReprintsApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkPrintReprintsApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "reprints"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "jobs"] });
        },
    });
}

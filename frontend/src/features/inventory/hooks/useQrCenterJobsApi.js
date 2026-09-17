import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getQrCenterJobsApi,
    reprintJobRangeApi,
    verifyJobSampleApi,
} from "../services/qrCenter.api.js";

export function useQrCenterJobsApi({ status, page = 1, limit = 20 } = {}) {
    return useQuery({
        queryKey: ["qr-center", "jobs", { status, page, limit }],
        queryFn: () => getQrCenterJobsApi({ status, page, limit }),
        placeholderData: keepPreviousData,
    });
}

export function useReprintJobRangeApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reprintJobRangeApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qr-center", "jobs"] }),
    });
}

export function useVerifyJobSampleApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: verifyJobSampleApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qr-center", "jobs"] }),
    });
}

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    dropStockInChallanApi,
    getNextStockInSerialApi,
    getStockInChallanApi,
    getStockInChallansApi,
    getStockInJobberSummaryApi,
    logStockInChallanEventApi,
    updateStockInChallanApi,
} from "../services/stockInChallan.api.js";

export function useStockInChallansApi(params) {
    return useQuery({
        queryKey: ["stock-in", "challans", params],
        queryFn: () => getStockInChallansApi(params),
        placeholderData: keepPreviousData,
    });
}

export function useStockInChallanApi(id) {
    return useQuery({
        queryKey: ["stock-in", "challan", id],
        queryFn: () => getStockInChallanApi(id),
        enabled: Boolean(id),
        staleTime: 0,
    });
}

export function useStockInJobberSummaryApi({ enabled = true } = {}) {
    return useQuery({
        queryKey: ["stock-in", "jobber-summary"],
        queryFn: getStockInJobberSummaryApi,
        enabled,
    });
}

// The serial the NEXT completed inward will get — shown (not reserved) in the wizard header.
export function useNextStockInSerialApi() {
    return useQuery({
        queryKey: ["stock-in", "next-serial"],
        queryFn: getNextStockInSerialApi,
        staleTime: 0,
    });
}

// Edits / drops change the register, the dashboard strip, QR Center and Current Stock.
function useChallanMutation(mutationFn, { alsoStock = false } = {}) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-in"] });
            if (alsoStock) {
                queryClient.invalidateQueries({ queryKey: ["qr-center"] });
                queryClient.invalidateQueries({ queryKey: ["current-stock"] });
            }
        },
    });
}

export const useUpdateStockInChallanApi = () => useChallanMutation(updateStockInChallanApi);

export const useDropStockInChallanApi = () => useChallanMutation(dropStockInChallanApi, { alsoStock: true });

export const useLogStockInChallanEventApi = () => useChallanMutation(logStockInChallanEventApi);

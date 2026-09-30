import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerStockOutApi } from "../services/stockOut.api.js";

export function useStockOutRegisterApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: registerStockOutApi,
        // A sale removes stock — Current Stock and Stock History must not show pre-sale numbers.
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current-stock"] });
            queryClient.invalidateQueries({ queryKey: ["stock-history"] });
        },
    });
}

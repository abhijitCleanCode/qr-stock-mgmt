import { useMutation } from "@tanstack/react-query";
import { registerStockOutApi } from "../services/stockOut.api.js";

export function useStockOutRegisterApi() {
    return useMutation({
        mutationFn: registerStockOutApi,
    });
}

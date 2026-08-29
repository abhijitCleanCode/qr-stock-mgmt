import { useMutation } from "@tanstack/react-query";
import { registerStockInApi } from "../services/stockIn.api.js";

export function useStockInRegisterApi() {
    return useMutation({
        mutationFn: registerStockInApi,
    });
}

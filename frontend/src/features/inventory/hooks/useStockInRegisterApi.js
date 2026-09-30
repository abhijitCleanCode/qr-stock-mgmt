import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerStockInApi } from "../services/stockIn.api.js";

export function useStockInRegisterApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: registerStockInApi,
        // A confirmed inward changes the dashboard stats/recent list, removes its draft, adds
        // registrations to QR Center, and changes Current Stock.
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stock-in"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center"] });
            queryClient.invalidateQueries({ queryKey: ["current-stock"] });
        },
    });
}

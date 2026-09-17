import { useMutation, useQueryClient } from "@tanstack/react-query";
import { breakSetApi } from "../services/qrCenter.api.js";

export function useBreakSetApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: breakSetApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "resolve"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
        },
    });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkGenerateApi } from "../services/qrCenter.api.js";

export function useBulkGenerateApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bulkGenerateApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "jobs"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "to-tag"] });
        },
    });
}

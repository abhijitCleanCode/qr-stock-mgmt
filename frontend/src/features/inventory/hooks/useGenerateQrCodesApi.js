import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateQrCodesApi } from "../services/qrCenter.api.js";

export function useGenerateQrCodesApi() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: generateQrCodesApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center"] });
        },
    });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadOrderFormPhotosApi } from "../services/orderFormPhoto.api.js";

export function useUploadOrderFormPhotosApi(orderFormId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (files) => uploadOrderFormPhotosApi(orderFormId, files),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-forms", orderFormId, "photos"] });
        },
    });
}

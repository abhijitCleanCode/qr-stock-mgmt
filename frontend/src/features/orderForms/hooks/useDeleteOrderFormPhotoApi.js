import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOrderFormPhotoApi } from "../services/orderFormPhoto.api.js";

export function useDeleteOrderFormPhotoApi(orderFormId) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (photoId) => deleteOrderFormPhotoApi(orderFormId, photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-forms", orderFormId, "photos"] });
        },
    });
}

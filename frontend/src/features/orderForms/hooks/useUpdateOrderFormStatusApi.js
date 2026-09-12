import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderFormStatusApi } from "../services/orderForm.api.js";

export function useUpdateOrderFormStatusApi() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }) => updateOrderFormStatusApi(id, status),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["order-forms"] });
            queryClient.invalidateQueries({ queryKey: ["order-forms", id] });
        },
    });
}

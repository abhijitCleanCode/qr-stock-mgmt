import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderFormApi } from "../services/orderForm.api.js";

export function useUpdateOrderFormApi() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }) => updateOrderFormApi(id, payload),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["order-forms"] });
            queryClient.invalidateQueries({ queryKey: ["order-forms", id] });
        },
    });
}

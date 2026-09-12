import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrderFormApi } from "../services/orderForm.api.js";

export function useCreateOrderFormApi() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createOrderFormApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-forms"] });
        },
    });
}

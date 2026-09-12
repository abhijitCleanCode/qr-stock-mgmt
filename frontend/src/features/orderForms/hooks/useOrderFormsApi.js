import { useQuery } from "@tanstack/react-query";
import { getOrderFormsApi } from "../services/orderForm.api.js";

export function useOrderFormsApi() {
    return useQuery({
        queryKey: ["order-forms"],
        queryFn: () => getOrderFormsApi(),
    });
}

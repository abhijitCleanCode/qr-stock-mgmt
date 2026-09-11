import { useQuery } from "@tanstack/react-query";
import { getOrderFormDetailApi } from "../services/orderForm.api.js";

export function useOrderFormDetailApi(id) {
    return useQuery({
        queryKey: ["order-forms", id],
        queryFn: () => getOrderFormDetailApi(id),
        enabled: Boolean(id),
    });
}

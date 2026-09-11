import { useQuery } from "@tanstack/react-query";
import { getSharedOrderFormApi } from "../services/orderFormPhoto.api.js";

export function useSharedOrderFormApi(orderFormNumber) {
    return useQuery({
        queryKey: ["order-forms", "share", orderFormNumber],
        queryFn: () => getSharedOrderFormApi(orderFormNumber),
        enabled: Boolean(orderFormNumber),
    });
}

import { useQuery } from "@tanstack/react-query";
import { getOrderFormPhotosApi } from "../services/orderFormPhoto.api.js";

export function useOrderFormPhotosApi(orderFormId) {
    return useQuery({
        queryKey: ["order-forms", orderFormId, "photos"],
        queryFn: () => getOrderFormPhotosApi(orderFormId),
        enabled: Boolean(orderFormId),
    });
}

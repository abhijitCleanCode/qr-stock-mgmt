import { useQuery } from "@tanstack/react-query";
import { getAllDesignsApi } from "../services/design.api.js";

export function useDesignListApi({ page = 1, limit = 20 } = {}) {
    return useQuery({
        queryKey: ["designs", { page, limit }],
        queryFn: () => getAllDesignsApi({ page, limit }),
    });
}

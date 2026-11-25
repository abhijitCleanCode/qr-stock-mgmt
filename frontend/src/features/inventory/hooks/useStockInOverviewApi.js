import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getStockInOverviewApi } from "../services/stockInDraft.api.js";
import { DEFAULT_CHALLAN_FILTERS } from "../utils/challanFilters.js";

// Parameters of the register's first page. These must equal the parameters the register sends for
// its default view, because that is the cache entry this response fills.
export const REGISTER_FIRST_PAGE = { ...DEFAULT_CHALLAN_FILTERS, page: 1, limit: 8 };

// One request for the whole first screen. The answer also fills the cache entries the dashboard
// widgets and the register read, so those screens render without asking the server again.
export function useStockInOverviewApi() {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ["stock-in", "overview"],
        queryFn: async () => {
            const response = await getStockInOverviewApi();
            const { dashboard, drafts, nextSerial, challans } = response.data;

            queryClient.setQueryData(["stock-in", "dashboard"], { data: dashboard });
            queryClient.setQueryData(["stock-in", "drafts"], { data: drafts });
            queryClient.setQueryData(["stock-in", "next-serial"], { data: nextSerial });
            queryClient.setQueryData(["stock-in", "challans", REGISTER_FIRST_PAGE], { data: challans });

            return response.data;
        },
        staleTime: 30_000,
    });
}

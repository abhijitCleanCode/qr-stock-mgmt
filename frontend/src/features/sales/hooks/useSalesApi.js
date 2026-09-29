import { useQuery } from "@tanstack/react-query";
import { getGalleryApi, getOverviewApi } from "../services/sales.api.js";

export function useOverviewApi() {
    return useQuery({ queryKey: ["sales-overview"], queryFn: getOverviewApi });
}

export function useGalleryApi({ mode, number, q, designId, stock }, enabled = true) {
    return useQuery({
        queryKey: ["sales-gallery", { mode, number, q, designId, stock }],
        queryFn: () => getGalleryApi({ mode, number, q, designId, stock }),
        enabled,
        // A failed fetch here is usually a mistyped document number, and retrying three times
        // just delays telling the user that.
        retry: false,
    });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDesignApi } from "../services/design.api.js";

export function useDesignDeleteApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDesignApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["designs"] });
        },
    });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    assignRecoveryIdentityApi,
    createRecoveryEntryApi,
    getQrCenterRecoveryApi,
} from "../services/qrCenter.api.js";

export function useQrCenterRecoveryApi({ status = "PENDING" } = {}) {
    return useQuery({
        queryKey: ["qr-center", "recovery", { status }],
        queryFn: () => getQrCenterRecoveryApi({ status }),
    });
}

export function useCreateRecoveryEntryApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRecoveryEntryApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["qr-center", "recovery"] }),
    });
}

export function useAssignRecoveryIdentityApi() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignRecoveryIdentityApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["qr-center", "recovery"] });
            queryClient.invalidateQueries({ queryKey: ["qr-center", "health"] });
        },
    });
}

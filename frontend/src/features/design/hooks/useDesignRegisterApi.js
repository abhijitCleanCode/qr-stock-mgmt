import { useMutation } from "@tanstack/react-query";
import { registerDesignApi } from "../services/design.api.js";

export function useDesignRegisterApi() {
    return useMutation({
        mutationFn: registerDesignApi,
    });
}

import { useMutation } from "@tanstack/react-query";
import { printCheckApi } from "../services/qrCenter.api.js";

export function usePrintCheckApi() {
    return useMutation({ mutationFn: printCheckApi });
}

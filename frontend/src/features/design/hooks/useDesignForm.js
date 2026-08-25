import { useForm } from "react-hook-form";

export const useDesignForm = () => {
    return useForm({
        mode: "onChange",
        defaultValues: {},
    });
};

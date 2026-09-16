import { FormProvider } from "react-hook-form";
import { toast } from "react-toastify";

import { useDesignForm } from "../hooks/useDesignForm";
import { useDesignWizard } from "../hooks/useDesignWizard";
import { useDesignRegisterApi } from "../hooks/useDesignRegisterApi";
import DesignStepper from "./DesignStepper";
import StepRenderer from "./StepRenderer";
import DesignWizardNavigation from "./DesignWizardNavigation";
import { DESIGN_STEPS } from "../steps/DesignSteps";

const DesignWizard = () => {
    const form = useDesignForm();

    const wizard = useDesignWizard(form);

    const { mutateAsync, isPending } = useDesignRegisterApi();

    const onSubmit = async (data) => {
        const { colorVariants = [], sizes = [], ...designData } = data;

        const designSizes = sizes.map((sizeLabel, index) => ({
            sizeLabel,
            displayOrder: index,
            includedInSet: true,
        }));

        try {
            const response = await mutateAsync({
                ...designData,
                colorVariants: colorVariants.map(({ colorName, colorHex }) => ({ colorName, colorHex })),
                designSizes,
                images: colorVariants.map((variant) => variant.imageFile),
            });

            toast.success(response?.message ?? "Design registered successfully.");

            form.reset();
            wizard.setActiveStep(0);
        } catch (error) {
            toast.error(error?.message ?? "Couldn't register design. Please try again.");
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <DesignStepper activeStep={wizard.activeStep} setActiveStep={wizard.setActiveStep} />

                <StepRenderer activeStep={wizard.activeStep} control={form.control} />

                <DesignWizardNavigation
                    activeStep={wizard.activeStep}
                    totalSteps={DESIGN_STEPS.length}
                    isSubmitting={isPending}
                    onNext={wizard.next}
                    onPrev={wizard.prev}
                />
            </form>
        </FormProvider>
    )
}

export default DesignWizard

import { FormProvider } from "react-hook-form";
import { useDesignForm } from "../hooks/useDesignForm";
import { useDesignWizard } from "../hooks/useDesignWizard";
import DesignStepper from "./DesignStepper";
import StepRenderer from "./StepRenderer";
import DesignWizardNavigation from "./DesignWizardNavigation";
import { DESIGN_STEPS } from "../steps/DesignSteps";

const DesignWizard = () => {
    const form = useDesignForm();

    const wizard = useDesignWizard(form);

    const onSubmit = (data) => {
        console.log("design wizard submit :: ", data);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <DesignStepper activeStep={wizard.activeStep} setActiveStep={wizard.setActiveStep} />

                <StepRenderer activeStep={wizard.activeStep} control={form.control} />

                <DesignWizardNavigation
                    activeStep={wizard.activeStep}
                    totalSteps={DESIGN_STEPS.length}
                    isSubmitting={false}
                    onNext={wizard.next}
                    onPrev={wizard.prev}
                />
            </form>
        </FormProvider>
    )
}

export default DesignWizard

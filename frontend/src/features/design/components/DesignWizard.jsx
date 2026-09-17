import { useState } from "react";
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

    // Populated by DesignIdentity (Step 1) once the typed Design Code matches an existing
    // design; consumed here (final duplicate gate) and by Variants (Step 3, to block adding a
    // colour that's already on that design) — see useExistingDesignByCode.
    const [existingDesignByCode, setExistingDesignByCode] = useState(null);

    const onSubmit = async (data) => {
        const { colorVariants = [], sizes = [], semiSets = [], ...designData } = data;

        const designSizes = sizes.map((sizeLabel, index) => ({
            sizeLabel,
            displayOrder: index,
            includedInSet: true,
        }));

        // Blank labels or sizeless entries are left-behind form state, not real semi sets.
        const semiSetsPayload = semiSets
            .filter((semiSet) => semiSet.label?.trim() && semiSet.sizeLabels?.length > 0)
            .map((semiSet, index) => ({
                label: semiSet.label.trim(),
                displayOrder: index,
                sizeLabels: semiSet.sizeLabels,
            }));

        // Last-resort client-side gate: if every submitted colour already exists on the matched
        // design, this submission has nothing new in it — the backend would reject it as a full
        // duplicate anyway, so avoid the round trip and image upload.
        if (existingDesignByCode) {
            const existingColorNames = new Set(
                (existingDesignByCode.colorVariants ?? []).map((variant) => variant.colorName.trim().toLowerCase())
            );
            const nothingNewSubmitted = colorVariants.length > 0 && colorVariants.every(
                (variant) => existingColorNames.has(variant.colorName.trim().toLowerCase())
            );

            if (nothingNewSubmitted) {
                toast.error("Design already exists in the database.");
                return;
            }
        }

        try {
            const response = await mutateAsync({
                ...designData,
                colorVariants: colorVariants.map(({ colorName, colorHex }) => ({ colorName, colorHex })),
                designSizes,
                semiSets: semiSetsPayload,
                images: colorVariants.map((variant) => variant.imageFile),
            });

            toast.success(response?.message ?? "Design registered successfully.");

            form.reset();
            wizard.setActiveStep(0);
            setExistingDesignByCode(null);
        } catch (error) {
            toast.error(error?.message ?? "Couldn't register design. Please try again.");
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <DesignStepper activeStep={wizard.activeStep} setActiveStep={wizard.setActiveStep} />

                <StepRenderer
                    activeStep={wizard.activeStep}
                    control={form.control}
                    existingDesignByCode={existingDesignByCode}
                    setExistingDesignByCode={setExistingDesignByCode}
                />

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

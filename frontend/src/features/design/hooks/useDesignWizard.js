import { useState } from "react";
import { DESIGN_STEPS } from "../steps/DesignSteps";

export const useDesignWizard = (form) => {
    const [activeStep, setActiveStep] = useState(0);

    const next = async () => {
        const fields = DESIGN_STEPS[activeStep].fields;

        const isValid = await form.trigger(fields);

        if (isValid && activeStep < DESIGN_STEPS.length - 1) {
            setActiveStep(prev => prev + 1);
        }
    };

    const prev = () => {
        if (activeStep > 0) {
            setActiveStep(prev => prev - 1);
        }
    };

    return {
        activeStep,
        setActiveStep,
        next,
        prev,
    };
}

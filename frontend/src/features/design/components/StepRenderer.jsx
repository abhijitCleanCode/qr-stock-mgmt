import { DESIGN_STEPS } from "../steps/DesignSteps";

const StepRenderer = ({ activeStep, control }) => {
    const CurrentStep = DESIGN_STEPS[activeStep].component;

    return (
        <CurrentStep control={control} />
    )
}

export default StepRenderer

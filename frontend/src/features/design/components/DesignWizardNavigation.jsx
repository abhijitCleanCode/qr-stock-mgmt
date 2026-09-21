import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const DesignWizardNavigation = ({
    activeStep,
    totalSteps,
    isSubmitting,
    onNext,
    onPrev,
}) => {
    const isFirstStep = activeStep === 0;

    const isLastStep = activeStep === totalSteps - 1;

    return (
        <div className="flex items-center justify-between">
            <Button
                type="button"
                variant="outline"
                disabled={isFirstStep}
                onClick={onPrev}
                className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors hover:!bg-[#00694C] hover:!text-white"
            >
                Prev
            </Button>

            {!isLastStep ? (
                <Button type="button" onClick={onNext} className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors hover:!bg-[#00694C] hover:!text-white">Next</Button>
            ) : (
                <Button type="submit" disabled={isSubmitting} className="text-[#1E1B4B] p-4 neu-button rounded-full transition-colors hover:!bg-[#00694C] hover:!text-white">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Save"}
                </Button>
            )}
        </div>
    )
}

export default DesignWizardNavigation
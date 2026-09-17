import { ArrowLeft, ArrowRight, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STOCK_IN_STEPS } from "../../hooks/useStockInWizard";

const StockInWizardNavigation = ({ activeStep, onPrev, onNext, onSaveDraft, isSubmitting }) => {
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === STOCK_IN_STEPS.length - 1;

  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
      <Button
        type="button"
        variant="ghost"
        disabled={isFirstStep}
        onClick={onPrev}
        className="gap-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        <ArrowLeft className="size-4" />
        Prev
      </Button>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          className="rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Save as Draft
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className={
            isLastStep
              ? "gap-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-black"
              : "gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
          }
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isLastStep ? (
            <>
              Confirm Inward &amp; Print Labels
              <Printer className="size-4" />
            </>
          ) : (
            <>
              Next Step
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StockInWizardNavigation;

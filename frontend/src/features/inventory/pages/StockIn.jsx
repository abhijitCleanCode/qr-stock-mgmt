import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import StockInStepper from "../components/stock-in/StockInStepper";
import StockInWizardNavigation from "../components/stock-in/StockInWizardNavigation";
import { useStockInWizard } from "../hooks/useStockInWizard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { useStockInRegisterApi } from "../hooks/useStockInRegisterApi";
import { buildStockInPayload } from "../utils/buildStockInPayload";
import { getVariantKey } from "../utils/variantKey";
import InwardDetailsStep from "../steps/stockIn/InwardDetailsStep";
import SetMatrixStep from "../steps/stockIn/SetMatrixStep";
import QcDefectStep from "../steps/stockIn/QcDefectStep";
import QrTagStudioStep from "../steps/stockIn/QrTagStudioStep";
import SummaryStep from "../steps/stockIn/SummaryStep";

const STOCK_IN_DRAFT_KEY = "stockIn.draft.v1";

// "YYYY-MM-DD" in the user's own local calendar day — never via `new Date().toISOString()`,
// which reads UTC and can report yesterday's/tomorrow's date depending on the local offset.
function todayAsIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const StockIn = () => {
  const [jobber, setJobber] = useState({ id: null, name: "" });
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState(todayAsIsoDate);

  const [selectedVariants, setSelectedVariants] = useState([]);
  // All variants added against one inward batch share the same Job Work/Design reference, so
  // the selling price registered on that design (fetched via DesignSearchInput) applies to the
  // whole batch — taken from the first variant added rather than re-entered by hand.
  const sellingPricePerPiece = selectedVariants[0]?.sellingPricePerPiece ?? 0;
  const {
    configs,
    ensureConfig,
    setTotalSetsReceived,
    setLoosePieces,
    addBundle,
    updateBundle,
    removeBundle,
    reset: resetConfigs,
  } = useVariantStockConfigs();

  // Per-variant derived totals (sets/loose/garments), reported up by each SetMatrixVariantCard
  // once it knows its own active sizes — single source of truth consumed by QC, QR Tag Studio
  // and Summary so every step stays dynamically linked to what was actually entered in Step 2.
  const [variantTotals, setVariantTotals] = useState({});
  const handleVariantTotalsChange = (key, totals) => {
    setVariantTotals((prev) => ({ ...prev, [key]: totals }));
  };

  // QC overrides per variant — only holds fields the user has actually hand-edited. Until
  // touched, Passed keeps auto-syncing to the live "expected" (garments) total from Step 2
  // (resolved into `qcByKey` below), same as the reference workflow's live recalculation.
  const [qcOverridesByKey, setQcOverridesByKey] = useState({});
  const qcByKey = useMemo(() => {
    const resolved = {};
    for (const [key, totals] of Object.entries(variantTotals)) {
      const override = qcOverridesByKey[key];
      resolved[key] = {
        passed: override?.passed ?? totals.garmentsTotal,
        defects: override?.defects ?? 0,
        category: override?.category ?? "No defect detected",
      };
    }
    return resolved;
  }, [variantTotals, qcOverridesByKey]);

  const handleQcFieldChange = (key, patch) => {
    setQcOverridesByKey((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const [defectAction, setDefectAction] = useState("seconds");
  const [qcRemarks, setQcRemarks] = useState("");

  // "parent" | "parentChild" | "custom" — QR Tag Studio's tagging strategy. Per-variant
  // include/child-tag overrides only apply when strategy is "custom"; QrTagStudioStep
  // defaults any variant missing from this map to { included: true, childTags: false }.
  const [printStrategy, setPrintStrategy] = useState("parent");
  const [qrPerVariantSettings, setQrPerVariantSettings] = useState({});
  const [printer, setPrinter] = useState("TSC TE244 Thermal Roll (50x30mm) [Bluetooth]");
  const [printOnConfirm, setPrintOnConfirm] = useState(false);
  // TODO(follow-up, not in this plan's scope): PRINTERS in qrTagStudio.js is a static
  // display list, not sourced from the printers table — there is currently no real
  // printerId to send. Until a printer-selection API exists, printOnConfirm can only be
  // sent as false; the UI still lets the user click "Send to printer" (matches the
  // existing "honest frontend simulation" pattern noted in handleTestPrint below), but the
  // request omits printerId and printOnConfirm to avoid the backend's mandatory
  // printerId-when-printOnConfirm rule rejecting the request.
  const printerId = undefined;

  const toggleVariantIncluded = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: false };
      return { ...prev, [key]: { ...current, included: !current.included } };
    });
  };

  const toggleVariantChildTags = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: false };
      return { ...prev, [key]: { ...current, childTags: !current.childTags } };
    });
  };

  const toggleVariantTagLoosePieces = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: false };
      return { ...prev, [key]: { ...current, tagLoosePieces: !current.tagLoosePieces } };
    });
  };

  const { mutateAsync: registerStockIn, isPending } = useStockInRegisterApi();

  const handleAddVariant = (variant) => {
    const key = getVariantKey(variant);
    setSelectedVariants((prev) => (prev.some((item) => getVariantKey(item) === key) ? prev : [...prev, variant]));
    ensureConfig(variant);
  };

  const omitKey = (record, key) =>
    Object.fromEntries(Object.entries(record).filter(([recordKey]) => recordKey !== key));

  const handleRemoveVariant = (variant) => {
    const key = getVariantKey(variant);
    setSelectedVariants((prev) => prev.filter((item) => getVariantKey(item) !== key));
    setVariantTotals((prev) => omitKey(prev, key));
    setQcOverridesByKey((prev) => omitKey(prev, key));
    setQrPerVariantSettings((prev) => omitKey(prev, key));
  };

  const resetAll = () => {
    setSelectedVariants([]);
    resetConfigs();
    setVariantTotals({});
    setQcOverridesByKey({});
    setJobber({ id: null, name: "" });
    setChallanNo("");
    setChallanDate(todayAsIsoDate());
    setDefectAction("seconds");
    setQcRemarks("");
    setPrintStrategy("parent");
    setQrPerVariantSettings({});
    setPrintOnConfirm(false);
  };

  const canAdvance = (step) => {
    if (step === 0) {
      if (!challanNo.trim()) {
        toast.error("Jobber Delivery Challan No. is required.");
        return false;
      }
      if (selectedVariants.length === 0) {
        toast.error("Add at least one design colour variant before continuing.");
        return false;
      }
      return true;
    }
    if (step === 1) {
      const totalGarments = Object.values(variantTotals).reduce((sum, item) => sum + item.garmentsTotal, 0);
      if (totalGarments === 0) {
        toast.error("Enter at least one full set or loose piece before continuing.");
        return false;
      }
      return true;
    }
    return true;
  };

  const wizard = useStockInWizard(canAdvance);

  const handleConfirmInward = async () => {
    const payload = buildStockInPayload(selectedVariants, configs, {
      deliveryDate: challanDate,
      challanNo,
      printStrategy,
      qrPerVariantSettings,
      printOnConfirm: printOnConfirm && Boolean(printerId),
      printerId,
    });

    if (payload.designs.length === 0) {
      toast.error("Enter stock for at least one variant before registering.");
      return;
    }

    const totalSets = Object.values(variantTotals).reduce((sum, item) => sum + item.setsTotal, 0);
    const totalPassed = Object.values(qcByKey).reduce((sum, item) => sum + (Number(item.passed) || 0), 0);

    try {
      const result = await registerStockIn(payload);
      const printedMessage = result?.data?.printJobId
        ? ` Print job #${result.data.printJobId} queued to ${printer.split(" [")[0]}.`
        : "";
      toast.success(`Stock Inward confirmed! ${totalSets} Parent & ${totalPassed} Child QR tags generated.${printedMessage}`);
      localStorage.removeItem(STOCK_IN_DRAFT_KEY);
      resetAll();
      wizard.setActiveStep(0);
    } catch (error) {
      toast.error(error?.message ?? "Couldn't register stock. Please try again.");
    }
  };

  const handleNext = () => {
    if (wizard.activeStep === 4) {
      handleConfirmInward();
      return;
    }
    wizard.next();
  };

  const handleSaveDraft = () => {
    try {
      const draft = {
        jobber,
        challanNo,
        challanDate,
        selectedVariants,
        configs,
        qcOverridesByKey,
        defectAction,
        qcRemarks,
        printStrategy,
        qrPerVariantSettings,
        printer,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STOCK_IN_DRAFT_KEY, JSON.stringify(draft));
      toast.success("Stock inward batch draft saved on this device.");
    } catch {
      toast.error("Couldn't save draft — your browser may be blocking local storage.");
    }
  };

  // No physical printer/driver integration exists yet — this is an honest frontend
  // simulation (toast only), not a real call to hardware. See useStockInRegisterApi for the
  // one thing that IS real here: the QR short codes themselves are generated server-side on
  // Confirm, so whatever eventually drives real printing has real codes to print.
  const handleTestPrint = (tagId) => {
    toast.success(`Test label ${tagId ? `(${tagId}) ` : ""}sent to ${printer.split(" [")[0]}.`);
  };

  return (
    <div className="mx-auto flex min-h-[640px] w-full max-w-5xl flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:p-8">
      <div className="mb-6 space-y-5 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Inwarding</h1>
          <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
            Log received stock from Jobbers &amp; generate inventory QR tags.
          </p>
        </div>

        <StockInStepper activeStep={wizard.activeStep} setActiveStep={wizard.setActiveStep} />
      </div>

      <div className="flex-1">
        {wizard.activeStep === 0 && (
          <InwardDetailsStep
            jobber={jobber}
            onJobberChange={setJobber}
            challanNo={challanNo}
            onChallanNoChange={setChallanNo}
            challanDate={challanDate}
            onChallanDateChange={setChallanDate}
            selectedVariants={selectedVariants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            sellingPricePerPiece={sellingPricePerPiece}
          />
        )}

        {wizard.activeStep === 1 && (
          <SetMatrixStep
            selectedVariants={selectedVariants}
            configs={configs}
            onSetTotalSetsReceived={setTotalSetsReceived}
            onSetLoosePieces={setLoosePieces}
            onAddBundle={addBundle}
            onUpdateBundle={updateBundle}
            onRemoveBundle={removeBundle}
            variantTotals={variantTotals}
            onVariantTotalsChange={handleVariantTotalsChange}
            sellingPricePerPiece={sellingPricePerPiece}
          />
        )}

        {wizard.activeStep === 2 && (
          <QcDefectStep
            selectedVariants={selectedVariants}
            variantTotals={variantTotals}
            qcByKey={qcByKey}
            onQcFieldChange={handleQcFieldChange}
            defectAction={defectAction}
            onDefectActionChange={setDefectAction}
            qcRemarks={qcRemarks}
            onQcRemarksChange={setQcRemarks}
          />
        )}

        {wizard.activeStep === 3 && (
          <QrTagStudioStep
            selectedVariants={selectedVariants}
            variantTotals={variantTotals}
            configs={configs}
            qcByKey={qcByKey}
            jobber={jobber}
            challanNo={challanNo}
            challanDate={challanDate}
            defectAction={defectAction}
            printStrategy={printStrategy}
            onPrintStrategyChange={setPrintStrategy}
            perVariantSettings={qrPerVariantSettings}
            onToggleVariantIncluded={toggleVariantIncluded}
            onToggleVariantChildTags={toggleVariantChildTags}
            onToggleVariantTagLoosePieces={toggleVariantTagLoosePieces}
            printer={printer}
            printerId={printerId}
            onPrinterChange={setPrinter}
            onTestPrint={handleTestPrint}
            onSetPrintOnConfirm={setPrintOnConfirm}
            onAdvance={wizard.next}
          />
        )}

        {wizard.activeStep === 4 && (
          <SummaryStep
            selectedVariants={selectedVariants}
            variantTotals={variantTotals}
            qcByKey={qcByKey}
            defectAction={defectAction}
            sellingPricePerPiece={sellingPricePerPiece}
            challanNo={challanNo}
          />
        )}
      </div>

      <StockInWizardNavigation
        activeStep={wizard.activeStep}
        onPrev={wizard.prev}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        isSubmitting={isPending}
      />
    </div>
  );
};

export default StockIn;

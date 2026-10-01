import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2 } from "lucide-react";

import StockInStepper from "../components/stock-in/StockInStepper";
import StockInWizardNavigation from "../components/stock-in/StockInWizardNavigation";
import ConfirmedA4QrPrintSheet from "../components/stock-in/qrTagStudio/ConfirmedA4QrPrintSheet";
import { useStockInWizard } from "../hooks/useStockInWizard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { useStockInRegisterApi } from "../hooks/useStockInRegisterApi";
import { getQrCenterRegistrationDetailApi } from "../services/qrCenter.api.js";
import { submitA4QrPrintJob } from "../services/localPrintAgent.api.js";
import { useSaveStockInDraftApi, useStockInDraftApi } from "../hooks/useStockInDraftsApi";
import { buildStockInPayload } from "../utils/buildStockInPayload";
import { getVariantKey } from "../utils/variantKey";
import InwardDetailsStep from "../steps/stockIn/InwardDetailsStep";
import SetMatrixStep from "../steps/stockIn/SetMatrixStep";
import QcDefectStep from "../steps/stockIn/QcDefectStep";
import QrTagStudioStep from "../steps/stockIn/QrTagStudioStep";
import SummaryStep from "../steps/stockIn/SummaryStep";

// "YYYY-MM-DD" in the user's own local calendar day — never via `new Date().toISOString()`,
// which reads UTC and can report yesterday's/tomorrow's date depending on the local offset.
function todayAsIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Mounted at /stock-in/new (fresh inward) and /stock-in/drafts/:draftId (resuming a draft saved
// server-side — see the Stock In dashboard). Every successful "Next Step" autosaves the draft at
// the step just reached, so the dashboard can list it and resume it at that exact step.
const StockIn = () => {
  const navigate = useNavigate();
  const { draftId: routeDraftId } = useParams();

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
    hydrate: hydrateConfigs,
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

  // "parent" | "parentChild" | "custom" — QR Tag Studio's tagging strategy. Only
  // "parentChild" and "parent" (shown to the user as "Loose pieces only") are reachable
  // from the Strategy Cards UI — see StrategyCards.jsx. Defaults to "parentChild", matching
  // the reference mock's own default. Per-variant include/child-tag overrides only apply
  // when strategy is "custom" (unreachable from this UI, kept for backend/API compatibility);
  // QrTagStudioStep defaults any variant missing from this map to
  // { included: true, childTags: false }.
  const [printStrategy, setPrintStrategy] = useState("parentChild");
  const [qrPerVariantSettings, setQrPerVariantSettings] = useState({});
  const [printer, setPrinter] = useState("A4 Laser Printer (Oddy ST-65 A4 · 65-Up)");
  const [printOnConfirm, setPrintOnConfirm] = useState(false);
  const [printConfig, setPrintConfig] = useState({ engine: "a4", a4Preset: "65", a4StartAt: 1 });
  const [confirmedQrPrint, setConfirmedQrPrint] = useState(null);
  // Physical dispatch is handled by the local print agent; the backend printer registry is
  // intentionally not used because its printer IDs do not identify the tester's OS queue.
  const printerId = undefined;

  const toggleVariantIncluded = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: true };
      return { ...prev, [key]: { ...current, included: !current.included } };
    });
  };

  const toggleVariantChildTags = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: true };
      return { ...prev, [key]: { ...current, childTags: !current.childTags } };
    });
  };

  const toggleVariantTagLoosePieces = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false, tagLoosePieces: true };
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
    setPrintStrategy("parentChild");
    setQrPerVariantSettings({});
    setPrintOnConfirm(false);
    setPrintConfig({ engine: "a4", a4Preset: "65", a4StartAt: 1 });
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

  // --- Server-side draft (create on first save, update after) ---
  // draftIdRef is what saves/confirm read (always current inside async callbacks);
  // hydratedDraftId is the draft this wizard's state currently reflects, for rendering.
  const draftIdRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const [hydratedDraftId, setHydratedDraftId] = useState(null);
  const draftQuery = useStockInDraftApi(routeDraftId);
  const { mutateAsync: saveDraft, isPending: isSavingDraft } = useSaveStockInDraftApi();

  // Resume: copy the saved wizard state in once per draft — adjusted during render (not in an
  // effect) so the steps never flash empty before the draft's own state appears.
  const loadedDraft = draftQuery.data?.data;
  if (routeDraftId && loadedDraft && String(loadedDraft.id) === routeDraftId && hydratedDraftId !== routeDraftId) {
    const saved = loadedDraft.state ?? {};
    setHydratedDraftId(routeDraftId);
    setJobber(saved.jobber ?? { id: null, name: "" });
    setChallanNo(saved.challanNo ?? "");
    setChallanDate(saved.challanDate || todayAsIsoDate());
    setSelectedVariants(saved.selectedVariants ?? []);
    hydrateConfigs(saved.configs ?? {});
    setVariantTotals(saved.variantTotals ?? {});
    setQcOverridesByKey(saved.qcOverridesByKey ?? {});
    setDefectAction(saved.defectAction ?? "seconds");
    setQcRemarks(saved.qcRemarks ?? "");
    setPrintStrategy(saved.printStrategy ?? "parentChild");
    setQrPerVariantSettings(saved.qrPerVariantSettings ?? {});
    if (saved.printer) setPrinter(saved.printer);
    wizard.setActiveStep(loadedDraft.currentStep ?? 0);
  }
  const isHydratingDraft = Boolean(routeDraftId) && hydratedDraftId !== routeDraftId && !draftQuery.isError;

  const buildDraftState = () => ({
    jobber,
    challanNo,
    challanDate,
    selectedVariants,
    configs,
    // Persisted so a draft resumed past Step 2 still has its totals — SetMatrixVariantCard only
    // reports them while Step 2 is mounted.
    variantTotals,
    qcOverridesByKey,
    defectAction,
    qcRemarks,
    printStrategy,
    qrPerVariantSettings,
    printer,
  });

  // Saves are chained so a quick double "Next" can never POST two drafts for one inward.
  const persistDraft = (currentStep, { silent }) => {
    const state = buildDraftState();
    const run = saveChainRef.current.then(async () => {
      const existingId = draftIdRef.current ?? (hydratedDraftId ? Number(hydratedDraftId) : null);
      try {
        const result = await saveDraft({ draftId: existingId, currentStep, state });
        const savedId = result?.data?.id;
        if (savedId && !existingId) {
          draftIdRef.current = savedId;
          setHydratedDraftId(String(savedId));
          navigate(`/stock-in/drafts/${savedId}`, { replace: true });
        }
        if (!silent) toast.success("Draft saved — resume it any time from the Stock In dashboard.");
      } catch (error) {
        toast.error(
          silent
            ? `Couldn't autosave this draft: ${error?.message ?? "unknown error"}`
            : (error?.message ?? "Couldn't save draft. Please try again."),
        );
      }
    });
    saveChainRef.current = run;
    return run;
  };

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
      // Let any in-flight autosave finish first so its draft id is known and removed on confirm.
      await saveChainRef.current;
      const draftId = draftIdRef.current ?? (hydratedDraftId ? Number(hydratedDraftId) : null);
      const result = await registerStockIn(draftId ? { ...payload, draftId } : payload);
      if (printOnConfirm && printConfig.engine === "a4") {
        try {
          const registrationDetails = await Promise.all(
            (result?.data?.variants ?? []).map((variant) =>
              getQrCenterRegistrationDetailApi({
                registrationType: "STOCK_IN",
                registrationId: variant.stockInTransactionId,
              }),
            ),
          );
          const printItems = registrationDetails.flatMap((response) => {
            const detail = response?.data;
            return (detail?.qrs ?? []).map((qr) => ({
              ...qr,
              design: detail.registration?.design,
              variant: detail.registration?.variant,
            }));
          });

          if (printItems.length === 0) throw new Error("No saved QR labels were returned for this inward.");

          try {
            const printResult = await submitA4QrPrintJob({ items: printItems, startAt: printConfig.a4StartAt });
            toast.success(`${printResult.count} QR labels submitted to ${printResult.printer}.`);
            resetAll();
            navigate("/stock-in");
            return;
          } catch (error) {
            toast.warning(`${error.message} Opening the browser print dialog as a fallback.`);
            setConfirmedQrPrint({ items: printItems, startAt: printConfig.a4StartAt });
            return;
          }
        } catch {
          toast.error("Stock Inward confirmed, but the saved QR labels could not be loaded for printing.");
          resetAll();
          navigate("/stock-in");
          return;
        }
      }
      toast.success(`Stock Inward confirmed! ${totalSets} Parent & ${totalPassed} Child QR tags generated.`);
      resetAll();
      navigate("/stock-in");
    } catch (error) {
      toast.error(error?.message ?? "Couldn't register stock. Please try again.");
    }
  };

  const handleNext = () => {
    if (wizard.activeStep === 4) {
      handleConfirmInward();
      return;
    }
    const nextStep = wizard.next();
    if (nextStep !== null) persistDraft(nextStep, { silent: true });
  };

  const handleSaveDraft = () => persistDraft(wizard.activeStep, { silent: false });

  // Test labels are sample IDs from the studio, not persisted QR payloads. Only confirmed
  // inward jobs are sent to the local agent with their server-generated QR payloads.
  const handleTestPrint = (tagId) => {
    toast.info(`No test label was sent${tagId ? ` (${tagId})` : ""}; use a confirmed inward to print saved QR codes.`);
  };

  const handleConfirmedPrintComplete = () => {
    setConfirmedQrPrint(null);
    resetAll();
    navigate("/stock-in");
  };

  return (
    <div className="mx-auto flex min-h-[760px] w-full max-w-6xl flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:p-8 lg:ml-2 lg:mr-[-72px] lg:w-[calc(100%+4rem)]">
      <div className="mb-6 space-y-5 border-b border-slate-100 pb-6">
        <div>
          <Link
            to="/stock-in"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-3.5" />
            Stock In dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Stock Inwarding</h1>
          <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
            Log received stock from Jobbers &amp; generate inventory QR tags.
          </p>
        </div>

        <StockInStepper activeStep={wizard.activeStep} setActiveStep={wizard.setActiveStep} />
      </div>

      {draftQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
          <p>{draftQuery.error?.message ?? "Couldn't load this draft."}</p>
          <Link to="/stock-in" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Back to Stock In dashboard
          </Link>
        </div>
      ) : isHydratingDraft ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading draft…
        </div>
      ) : (
      <>
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
            onSetPrintConfig={setPrintConfig}
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
        isSavingDraft={isSavingDraft}
      />
      </>
      )}
      {confirmedQrPrint && (
        <ConfirmedA4QrPrintSheet
          items={confirmedQrPrint.items}
          startAt={confirmedQrPrint.startAt}
          onAfterPrint={handleConfirmedPrintComplete}
        />
      )}
    </div>
  );
};

export default StockIn;

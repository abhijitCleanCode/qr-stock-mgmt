import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Loader2 } from "lucide-react";

import StockInStepper from "../components/stock-in/StockInStepper";
import StockInWizardNavigation from "../components/stock-in/StockInWizardNavigation";
import ConfirmedA4QrPrintSheet from "../components/stock-in/qrTagStudio/ConfirmedA4QrPrintSheet";
import { useStockInWizard } from "../hooks/useStockInWizard";
import { useVariantStockConfigs } from "../hooks/useVariantStockConfigs";
import { useStockInRegisterApi } from "../hooks/useStockInRegisterApi";
import { useNextStockInSerialApi } from "../hooks/useStockInChallansApi";
import { useWizardKeyboardNav } from "../hooks/useWizardKeyboardNav";
import { getQrCenterRegistrationDetailApi } from "../services/qrCenter.api.js";
import { submitA4QrPrintJob } from "../services/localPrintAgent.api.js";
import { useSaveStockInDraftApi, useStockInDraftApi } from "../hooks/useStockInDraftsApi";
import { buildStockInPayload } from "../utils/buildStockInPayload";
import { getVariantKey } from "../utils/variantKey";
import { NO_DEFECT_CATEGORY } from "../utils/qcDefects";
import { aggregateRows, computeVariantRow } from "../utils/qrTagStudio";
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
  const [issuedChallanNo, setIssuedChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState(todayAsIsoDate);
  const nextSerialQuery = useNextStockInSerialApi();
  const nextSerial = nextSerialQuery.data?.data?.serial;

  const [selectedVariants, setSelectedVariants] = useState([]);
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

  // QC per variant. Only what the user typed is stored (defective count + category); passed is
  // always what Set Matrix received minus the defective pieces, so the two can never drift
  // apart — even when Step 2's quantities change afterwards.
  const [qcOverridesByKey, setQcOverridesByKey] = useState({});
  const qcByKey = useMemo(() => {
    const resolved = {};
    for (const [key, totals] of Object.entries(variantTotals)) {
      const override = qcOverridesByKey[key];
      const defects = Math.min(Math.max(Number(override?.defects) || 0, 0), totals.garmentsTotal);
      resolved[key] = {
        passed: totals.garmentsTotal - defects,
        defects,
        category: override?.category ?? NO_DEFECT_CATEGORY,
      };
    }
    return resolved;
  }, [variantTotals, qcOverridesByKey]);

  const handleQcFieldChange = (key, patch) => {
    setQcOverridesByKey((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const [defectAction, setDefectAction] = useState("seconds");
  const [qcRemarks, setQcRemarks] = useState("");

  // QR Tag Studio: two independent switches, both on by default. Parent + Child tags every set
  // / semi set and every piece in it; Loose pieces tags the odd pieces. Off never skips issuing
  // the codes or registering the stock — those labels are just printed later from QR Center.
  // Per-variant overrides here are only Include (and child tags for the legacy "custom" mode).
  const [tagParentChild, setTagParentChild] = useState(true);
  const [tagLoose, setTagLoose] = useState(true);
  const printStrategy = tagParentChild ? "parentChild" : "none";
  const [qrPerVariantSettings, setQrPerVariantSettings] = useState({});
  const [printer, setPrinter] = useState("A4 Laser Printer (4×10 · 40-Up)");
  const [printOnConfirm, setPrintOnConfirm] = useState(false);
  const [printConfig, setPrintConfig] = useState({ engine: "a4", a4Preset: "40", a4StartAt: 1 });
  const [confirmedQrPrint, setConfirmedQrPrint] = useState(null);
  // Physical dispatch is handled by the local print agent; the backend printer registry is
  // intentionally not used because its printer IDs do not identify the tester's OS queue.
  const printerId = undefined;

  const toggleVariantIncluded = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false };
      return { ...prev, [key]: { ...current, included: !current.included } };
    });
  };

  const toggleVariantChildTags = (key) => {
    setQrPerVariantSettings((prev) => {
      const current = prev[key] ?? { included: true, childTags: false };
      return { ...prev, [key]: { ...current, childTags: !current.childTags } };
    });
  };

  // The one Loose pieces switch applied to every variant — what the queue, preview and payload read.
  const effectiveQrSettings = useMemo(
    () =>
      Object.fromEntries(
        selectedVariants.map((variant) => {
          const key = getVariantKey(variant);
          return [key, { included: true, childTags: false, ...qrPerVariantSettings[key], tagLoosePieces: tagLoose }];
        }),
      ),
    [selectedVariants, qrPerVariantSettings, tagLoose],
  );

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
    setIssuedChallanNo("");
    setChallanDate(todayAsIsoDate());
    setTriedSteps({});
    setDefectAction("seconds");
    setQcRemarks("");
    setTagParentChild(true);
    setTagLoose(true);
    setQrPerVariantSettings({});
    setPrintOnConfirm(false);
    setPrintConfig({ engine: "a4", a4Preset: "40", a4StartAt: 1 });
  };

  // Which steps the user has already tried to leave with a problem — inline errors only show
  // after that, so a fresh form isn't covered in red.
  const [triedSteps, setTriedSteps] = useState({});

  const getStepErrors = (step) => {
    const errors = {};
    if (step === 0) {
      if (!jobber?.name?.trim()) errors.jobber = "Select the jobber.";
      if (selectedVariants.length === 0) errors.design = "Add at least one design.";
      if (!challanNo.trim()) errors.challanNo = "Enter the jobber delivery challan no.";
      if (!issuedChallanNo.trim()) errors.issuedChallanNo = "Enter the issued challan number.";
      if (!challanDate) errors.challanDate = "Pick the inward date.";
      else if (challanDate > todayAsIsoDate()) errors.challanDate = "Inward date can't be in the future.";
    }
    if (step === 1) {
      const totalGarments = Object.values(variantTotals).reduce((sum, item) => sum + item.garmentsTotal, 0);
      if (totalGarments === 0) errors.matrix = "Enter at least one full set, semi set or loose piece before continuing.";
    }
    if (step === 2) {
      for (const variant of selectedVariants) {
        const key = getVariantKey(variant);
        const qc = qcByKey[key];
        if (qc && qc.defects > 0 && qc.category === NO_DEFECT_CATEGORY) {
          errors[key] = `Pick a defect category for ${variant.designCode ? `${variant.designCode} · ` : ""}${variant.colorName}.`;
        }
      }
    }
    return errors;
  };

  const canAdvance = (step) => {
    const first = Object.values(getStepErrors(step))[0];
    if (!first) return true;
    setTriedSteps((prev) => ({ ...prev, [step]: true }));
    toast.error(first);
    return false;
  };

  const wizard = useStockInWizard(canAdvance);

  // --- Server-side draft (create on first save, update after) ---
  // draftIdRef is what saves/confirm read (always current inside async callbacks);
  // hydratedDraftId is the draft this wizard's state currently reflects, for rendering.
  const draftIdRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const [hydratedDraftId, setHydratedDraftId] = useState(null);
  // Set once the inward is registered: the server deleted the draft, so stop fetching it (a
  // window-focus refetch would 404 and bounce the user off the confirmed-print sheet).
  const [consumedDraftId, setConsumedDraftId] = useState(null);
  const draftQuery = useStockInDraftApi(routeDraftId && routeDraftId !== consumedDraftId ? routeDraftId : null);
  const { mutateAsync: saveDraft, isPending: isSavingDraft } = useSaveStockInDraftApi();

  useEffect(() => {
    if (routeDraftId && draftQuery.isError && draftQuery.error?.status === 404) {
      toast.info("That saved draft no longer exists. Returning to Stock In.");
      navigate("/stock-in", { replace: true });
    }
  }, [routeDraftId, draftQuery.isError, draftQuery.error, navigate]);

  // Resume: copy the saved wizard state in once per draft — adjusted during render (not in an
  // effect) so the steps never flash empty before the draft's own state appears.
  const loadedDraft = draftQuery.data?.data;
  if (routeDraftId && loadedDraft && String(loadedDraft.id) === routeDraftId && hydratedDraftId !== routeDraftId) {
    const saved = loadedDraft.state ?? {};
    setHydratedDraftId(routeDraftId);
    setJobber(saved.jobber ?? { id: null, name: "" });
    setChallanNo(saved.challanNo ?? "");
    setIssuedChallanNo(saved.issuedChallanNo ?? "");
    setChallanDate(saved.challanDate || todayAsIsoDate());
    setSelectedVariants(saved.selectedVariants ?? []);
    hydrateConfigs(saved.configs ?? {});
    setVariantTotals(saved.variantTotals ?? {});
    setQcOverridesByKey(saved.qcOverridesByKey ?? {});
    setDefectAction(saved.defectAction ?? "seconds");
    setQcRemarks(saved.qcRemarks ?? "");
    // Drafts saved before the two tag switches existed carry a single printStrategy.
    setTagParentChild(saved.tagParentChild ?? saved.printStrategy !== "parent");
    setTagLoose(saved.tagLoose ?? true);
    setQrPerVariantSettings(saved.qrPerVariantSettings ?? {});
    if (saved.printer) setPrinter(saved.printer);
    wizard.setActiveStep(loadedDraft.currentStep ?? 0);
  }
  const isHydratingDraft = Boolean(routeDraftId) && hydratedDraftId !== routeDraftId && !draftQuery.isError;

  const buildDraftState = () => ({
    jobber,
    challanNo,
    issuedChallanNo,
    challanDate,
    selectedVariants,
    configs,
    // Persisted so a draft resumed past Step 2 still has its totals — SetMatrixVariantCard only
    // reports them while Step 2 is mounted.
    variantTotals,
    qcOverridesByKey,
    defectAction,
    qcRemarks,
    tagParentChild,
    tagLoose,
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
    // Steps can be reached out of order through the stepper, so re-check the data-entry steps.
    for (const step of [0, 1, 2]) {
      const first = Object.values(getStepErrors(step))[0];
      if (first) {
        setTriedSteps((prev) => ({ ...prev, [step]: true }));
        wizard.setActiveStep(step);
        toast.error(first);
        return;
      }
    }

    const payload = buildStockInPayload(selectedVariants, configs, {
      challan: {
        jobberName: jobber.name.trim(),
        challanNo: challanNo.trim(),
        issuedChallanNo: issuedChallanNo.trim(),
        stockDate: challanDate,
        remarks: qcRemarks.trim() || undefined,
        defectAction,
      },
      tagParentChild,
      qrPerVariantSettings: effectiveQrSettings,
      qcByKey,
      printOnConfirm: printOnConfirm && Boolean(printerId),
      printerId,
    });

    if (payload.designs.length === 0) {
      toast.error("Enter stock for at least one variant before registering.");
      return;
    }

    const totalReceived = Object.values(variantTotals).reduce((sum, item) => sum + item.garmentsTotal, 0);

    try {
      // Let any in-flight autosave finish first so its draft id is known and removed on confirm.
      await saveChainRef.current;
      const draftId = draftIdRef.current ?? (hydratedDraftId ? Number(hydratedDraftId) : null);
      const result = await registerStockIn(draftId ? { ...payload, draftId } : payload);
      const serialLabel = result?.data?.challan?.serialLabel;
      const registeredMessage = `Stock-in ${serialLabel ?? ""} registered · challan ${challanNo.trim()} · ${totalReceived} pcs added.`;
      if (draftId) setConsumedDraftId(String(draftId));
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
            const variantId = detail?.registration?.variant?.id;
            const variantKey = Object.entries(configs).find(([, config]) => config.colorVariantId === variantId)?.[0];
            const variantTotalsForPrint = variantKey ? variantTotals[variantKey] : null;
            const composition = variantTotalsForPrint?.sizeLabels ?? [];
            const sourceVariant = variantKey
              ? selectedVariants.find((variant) => getVariantKey(variant) === variantKey)
              : null;
            const displayCodes = { parent: [], child: [], loose: [] };
            for (const tag of printConfig.displayTags ?? []) {
              if (tag.variantKey === variantKey) displayCodes[tag.kind]?.push(tag.code);
            }
            const displayIndexes = { parent: 0, child: 0, loose: 0 };
            const variantIncluded = !variantKey || effectiveQrSettings[variantKey]?.included !== false;
            return (detail?.qrs ?? []).flatMap((qr) => {
              const kind = qr.type === "SET" || qr.type === "BUNDLE"
                ? "parent"
                : qr.parentStockItemId
                  ? "child"
                  : "loose";
              // Labels the user switched off (or excluded variants) stay in QR Center, unprinted.
              const printable = variantIncluded && (kind === "loose" ? tagLoose : tagParentChild);
              if (!printable) return [];
              const displayCode = displayCodes[kind]?.[displayIndexes[kind]++];
              return [{
              ...qr,
              design: detail.registration?.design,
              variant: detail.registration?.variant,
              composition,
              piecesPerSet: variantTotalsForPrint?.piecesPerSet ?? composition.length,
              sellingPricePerPiece: sourceVariant?.sellingPricePerPiece ?? 0,
              displayCode: displayCode ?? String(qr.payload?.setId ?? qr.stockItemId),
              }];
            });
          });

          if (printItems.length === 0) throw new Error("No saved QR labels were returned for this inward.");

          try {
            const printResult = await submitA4QrPrintJob({
              items: printItems,
              startAt: printConfig.a4StartAt,
              content: printConfig,
            });
            const sheetCount = Math.ceil((printResult.count + Number(printConfig.a4StartAt || 1) - 1) / 40);
            toast.success(`${registeredMessage} ${printResult.count} QR labels across ${sheetCount} sheets submitted to ${printResult.printer}.`);
            resetAll();
            navigate("/stock-in");
            return;
          } catch (error) {
            toast.warning(`${error.message} Opening the browser print dialog as a fallback.`);
            setConfirmedQrPrint({ items: printItems, startAt: printConfig.a4StartAt, content: printConfig });
            return;
          }
        } catch {
          toast.error("Stock Inward confirmed, but the saved QR labels could not be loaded for printing.");
          resetAll();
          navigate("/stock-in");
          return;
        }
      }
      toast.success(registeredMessage);
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

  // Enter / arrow-key entry on the three data-entry steps.
  const stepsRef = useRef(null);
  const handleAdvanceByKeyboard = useCallback(() => document.getElementById("stock-in-next")?.click(), []);
  useWizardKeyboardNav({ containerRef: stepsRef, enabled: wizard.activeStep <= 2, onAdvance: handleAdvanceByKeyboard });

  // Totals the Summary announces, from the same rows the QR Tag Studio queue uses.
  const tagCounts = useMemo(() => {
    const rows = selectedVariants.map((variant) => {
      const key = getVariantKey(variant);
      const totals = variantTotals[key] ?? { setsTotal: 0, semiSetsTotal: 0, looseTotal: 0 };
      return computeVariantRow(
        { key, setsTotal: totals.setsTotal, semiSetsTotal: totals.semiSetsTotal, looseTotal: totals.looseTotal, qcPassed: qcByKey[key]?.passed ?? 0 },
        printStrategy,
        effectiveQrSettings,
      );
    });
    const aggregate = aggregateRows(rows);
    return { parents: aggregate.parent, children: aggregate.child, loose: aggregate.loose };
  }, [selectedVariants, variantTotals, qcByKey, printStrategy, effectiveQrSettings]);

  const sizeLabelsById = useMemo(
    () => Object.fromEntries(Object.values(variantTotals).flatMap((totals) => (totals.sizes ?? []).map((size) => [String(size.id), size.sizeLabel]))),
    [variantTotals],
  );

  const stepErrors = {
    0: triedSteps[0] ? getStepErrors(0) : {},
    1: triedSteps[1] ? getStepErrors(1) : {},
    2: triedSteps[2] ? getStepErrors(2) : {},
  };

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Stock Inwarding</h1>
              <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                Log received stock from Jobbers &amp; generate inventory QR tags.
              </p>
            </div>
            <span
              title="Assigned when the inward is confirmed"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
            >
              Serial No. <b className="font-mono text-[13px] text-slate-900">{nextSerial ?? "…"}</b>
            </span>
          </div>
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
      <div className="flex-1" ref={stepsRef}>
        {wizard.activeStep === 0 && (
          <InwardDetailsStep
            jobber={jobber}
            onJobberChange={setJobber}
            challanNo={challanNo}
            onChallanNoChange={setChallanNo}
            issuedChallanNo={issuedChallanNo}
            onIssuedChallanNoChange={setIssuedChallanNo}
            challanDate={challanDate}
            onChallanDateChange={setChallanDate}
            nextSerial={nextSerial}
            selectedVariants={selectedVariants}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
            errors={stepErrors[0]}
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
            error={stepErrors[1].matrix}
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
            errors={stepErrors[2]}
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
            tagParentChild={tagParentChild}
            tagLoose={tagLoose}
            onToggleParentChild={() => setTagParentChild((on) => !on)}
            onToggleLoose={() => setTagLoose((on) => !on)}
            perVariantSettings={effectiveQrSettings}
            onToggleVariantIncluded={toggleVariantIncluded}
            onToggleVariantChildTags={toggleVariantChildTags}
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
            configs={configs}
            sizeLabelsById={sizeLabelsById}
            defectAction={defectAction}
            challanNo={challanNo}
            issuedChallanNo={issuedChallanNo}
            nextSerial={nextSerial}
            tagCounts={tagCounts}
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
          content={confirmedQrPrint.content}
          onAfterPrint={handleConfirmedPrintComplete}
        />
      )}
    </div>
  );
};

export default StockIn;

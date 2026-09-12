import { useMemo, useState } from "react";
import { Loader2Icon, PrinterIcon } from "lucide-react";
import { toast } from "react-toastify";
import { flushSync } from "react-dom";

import DataTable from "@/components/shared/table/DataTable";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/shared/ModalProvider";
import DesignSearchInput from "../components/DesignSearchInput";
import TransformSummaryDialog from "../components/TransformSummaryDialog";
import QrPrintSheet, { QrLabelCard } from "../components/qr-center/QrPrintSheet";
import { useLooseAvailabilityApi } from "../hooks/useLooseAvailabilityApi";
import { useAssembleSetApi } from "../hooks/useAssembleSetApi";
import { useAssembleBundleApi } from "../hooks/useAssembleBundleApi";
import { columns } from "../table/LooseAvailabilityColumns";
import { bundleColumns } from "../table/BundleAvailabilityColumns";

const MetricTile = ({ label, value, emphasize }) => (
  <div className="neu-button flex flex-col gap-1 rounded-xl px-4 py-3">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className={emphasize ? "text-2xl font-bold text-[#1E1B4B]" : "text-lg font-semibold text-foreground"}>
      {value}
    </span>
  </div>
);

const describeComposition = (composition) => composition.map((piece) => `${piece.size} × ${piece.quantity}`).join(", ");

const StockTransformation = () => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [transformationType, setTransformationType] = useState("SET");
  const [requestedSets, setRequestedSets] = useState(0);
  const [selectedBundleGroupId, setSelectedBundleGroupId] = useState(null);
  const [requestedBundles, setRequestedBundles] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [printItems, setPrintItems] = useState([]);

  const { openModal, closeModal } = useModal();

  const colorVariantId = selectedVariant?.colorVariantId;
  const { data: response, isPending, isFetching, isError, error, refetch } = useLooseAvailabilityApi(colorVariantId);
  const availability = response?.data;
  const maxSets = availability?.maxSets ?? 0;
  const bundleOptions = availability?.bundles ?? [];

  // A transformation just consumed loose pieces, so maxSets/maxBundles can drop out from under
  // a value the user already picked — clamp at read time instead of syncing state back from a prop.
  const setsToCreate = Math.min(requestedSets, maxSets);

  // With exactly one existing bundle configuration there's nothing to choose between (§7 of the
  // spec: don't invent a selection step the data model doesn't need) — it's used automatically.
  const effectiveBundleGroupId = selectedBundleGroupId ?? (bundleOptions.length === 1 ? bundleOptions[0].stockGroupId : null);
  const selectedBundle = bundleOptions.find((bundle) => bundle.stockGroupId === effectiveBundleGroupId) ?? null;
  const maxBundles = selectedBundle?.maxBundles ?? 0;
  const bundlesToCreate = Math.min(requestedBundles, maxBundles);

  const { mutateAsync: assembleSet, isPending: isSubmittingSet } = useAssembleSetApi();
  const { mutateAsync: assembleBundle, isPending: isSubmittingBundle } = useAssembleBundleApi();
  const isSubmitting = isSubmittingSet || isSubmittingBundle;

  const setRows = useMemo(() => {
    if (!availability) return [];
    return availability.sizes.map((size) => ({
      ...size,
      selectedToUse: setsToCreate,
      remaining: size.loosePieces - setsToCreate,
      maxSets,
      onSelectedToUseChange: setRequestedSets,
    }));
  }, [availability, setsToCreate, maxSets]);

  const bundleRows = useMemo(() => {
    if (!selectedBundle) return [];
    return selectedBundle.composition.map((piece) => {
      const totalConsume = piece.quantity * bundlesToCreate;
      return {
        designSizeId: piece.designSizeId,
        size: piece.size,
        loosePieces: piece.loosePieces,
        bundleQty: piece.quantity,
        bundlesToCreate,
        totalConsume,
        remaining: piece.loosePieces - totalConsume,
        maxBundles,
        onBundlesToCreateChange: setRequestedBundles,
      };
    });
  }, [selectedBundle, bundlesToCreate, maxBundles]);

  const handleSelect = (variant) => {
    setSelectedVariant(variant);
    setLastResult(null);
    setRequestedSets(0);
    setRequestedBundles(0);
    setSelectedBundleGroupId(null);
  };

  const handleSelectType = (type) => {
    setTransformationType(type);
    setLastResult(null);
  };

  const buildLabelItems = (unitType, generatedQrs) =>
    generatedQrs.map((qr) => ({
      stockItemId: qr.stockItemId,
      type: unitType,
      designCode: selectedVariant.designCode,
      designName: selectedVariant.designName,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      qr: { payload: qr.payload, generatedAt: qr.generatedAt },
    }));

  const handleConfirmSet = async () => {
    try {
      const result = await assembleSet({ colorVariantId, quantity: setsToCreate });
      const { setsCreated, generatedQrs } = result.data;

      toast.success(setsCreated === 1 ? "1 set created successfully." : `${setsCreated} sets created successfully.`);
      setLastResult({ unitLabel: "Set", unitsCreated: setsCreated, labelItems: buildLabelItems("SET", generatedQrs) });
      setRequestedSets(0);
      await refetch();
      return true;
    } catch (submitError) {
      toast.error(submitError?.message ?? "Couldn't transform loose pieces into sets. Please try again.");
      return false;
    }
  };

  const handleConfirmBundle = async () => {
    try {
      const result = await assembleBundle({ colorVariantId, stockGroupId: selectedBundle.stockGroupId, quantity: bundlesToCreate });
      const { bundlesCreated, generatedQrs } = result.data;

      toast.success(bundlesCreated === 1 ? "1 bundle created successfully." : `${bundlesCreated} bundles created successfully.`);
      setLastResult({ unitLabel: "Bundle", unitsCreated: bundlesCreated, labelItems: buildLabelItems("BUNDLE", generatedQrs) });
      setRequestedBundles(0);
      await refetch();
      return true;
    } catch (submitError) {
      toast.error(submitError?.message ?? "Couldn't transform loose pieces into bundles. Please try again.");
      return false;
    }
  };

  const handleOpenSummary = () => {
    const isSet = transformationType === "SET";

    openModal(TransformSummaryDialog, {
      design: { code: selectedVariant.designCode, name: selectedVariant.designName },
      variant: { colorName: selectedVariant.colorName, colorHex: selectedVariant.colorHex },
      unitLabel: isSet ? "Set" : "Bundle",
      bundleName: isSet ? undefined : describeComposition(selectedBundle.composition),
      quantityToCreate: isSet ? setsToCreate : bundlesToCreate,
      rows: isSet
        ? setRows.map((row) => ({ designSizeId: row.designSizeId, size: row.size, consume: row.selectedToUse, remaining: row.remaining }))
        : bundleRows.map((row) => ({ designSizeId: row.designSizeId, size: row.size, consume: row.totalConsume, remaining: row.remaining })),
      isSubmitting,
      onConfirm: isSet ? handleConfirmSet : handleConfirmBundle,
      onClose: closeModal,
    });
  };

  const handlePrint = (items) => {
    flushSync(() => setPrintItems(items));
    window.print();
  };

  const canTransform = transformationType === "SET"
    ? maxSets > 0 && setsToCreate > 0
    : Boolean(selectedBundle) && maxBundles > 0 && bundlesToCreate > 0;

  return (
    <div className="flex flex-col font-sans space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Stock Transformation</h1>
        <p className="text-sm text-muted-foreground">Convert loose pieces of a design variant into complete sets or bundles.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium" htmlFor="design-search">Design</label>
        <DesignSearchInput id="design-search" onSelect={handleSelect} />
      </div>

      {!selectedVariant && (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Search for a design and select a variant to see its available loose pieces.
        </p>
      )}

      {selectedVariant && (
        <>
          <div className="flex items-center gap-3 rounded-2xl p-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {selectedVariant.imageUrl && (
                <img src={selectedVariant.imageUrl} alt={selectedVariant.colorName} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-lg font-bold text-[#1E1B4B]">
                {selectedVariant.designCode ? `${selectedVariant.designCode} · ` : ""}
                {selectedVariant.designName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: selectedVariant.colorHex }}
                />
                {selectedVariant.colorName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Transformation Type</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={transformationType === "SET" ? "default" : "outline"}
                className={transformationType === "SET" ? "bg-[#00694C]" : ""}
                onClick={() => handleSelectType("SET")}
              >
                Set
              </Button>
              <Button
                type="button"
                variant={transformationType === "BUNDLE" ? "default" : "outline"}
                className={transformationType === "BUNDLE" ? "bg-[#00694C]" : ""}
                onClick={() => handleSelectType("BUNDLE")}
              >
                Bundle
              </Button>
            </div>
          </div>

          {isPending && (
            <p className="flex items-center justify-center gap-2 rounded-2xl border border-border py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading available loose pieces...
            </p>
          )}

          {!isPending && isError && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {error?.message ?? "Unable to load loose piece availability. Please try again."}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {!isPending && !isError && availability && transformationType === "SET" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricTile label="Total Loose Pieces" value={availability.sizes.reduce((sum, s) => sum + s.loosePieces, 0)} />
                <MetricTile label="Maximum Sets Possible" value={maxSets} emphasize />
                <MetricTile label="Sets Selected" value={setsToCreate} />
              </div>

              {availability.sizes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  This variant has no sizes configured as part of a set.
                </p>
              ) : maxSets === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No loose pieces are currently available for transformation into a set.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Maximum {maxSets} {maxSets === 1 ? "set" : "sets"} can be created from the available loose pieces.
                    Use the stepper in the "Select to Use" column to choose how many sets to create.
                  </p>

                  <DataTable columns={columns} data={setRows} />

                  <Button
                    type="button"
                    className="h-11 w-full bg-[#00694C] sm:w-auto sm:self-end"
                    onClick={handleOpenSummary}
                    disabled={!canTransform || isSubmitting || isFetching}
                  >
                    Transform to Sets
                  </Button>
                </>
              )}
            </>
          )}

          {!isPending && !isError && availability && transformationType === "BUNDLE" && (
            <>
              {bundleOptions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No bundle configurations exist for this variant yet. Bundles are defined the first time one is
                  received or assembled for this variant.
                </p>
              ) : (
                <>
                  {bundleOptions.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">Bundle Configuration</span>
                      <div className="flex flex-wrap gap-2">
                        {bundleOptions.map((bundle) => (
                          <button
                            key={bundle.stockGroupId}
                            type="button"
                            onClick={() => { setSelectedBundleGroupId(bundle.stockGroupId); setRequestedBundles(0); }}
                            className={`neu-button rounded-full border px-3 py-1.5 text-sm ${
                              bundle.stockGroupId === effectiveBundleGroupId
                                ? "border-[#00694C] font-semibold text-[#00694C]"
                                : "border-transparent text-foreground"
                            }`}
                          >
                            {describeComposition(bundle.composition)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBundle && (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <MetricTile label="Pieces per Bundle" value={selectedBundle.piecesPerBundle} />
                        <MetricTile label="Maximum Bundles Possible" value={maxBundles} emphasize />
                        <MetricTile label="Bundles Selected" value={bundlesToCreate} />
                      </div>

                      {maxBundles === 0 ? (
                        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                          No loose pieces are currently available to assemble this bundle configuration.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Maximum {maxBundles} {maxBundles === 1 ? "bundle" : "bundles"} can be created from the available loose pieces.
                            Use the stepper in the "Create" column to choose how many bundles to create.
                          </p>

                          <DataTable columns={bundleColumns} data={bundleRows} />

                          <Button
                            type="button"
                            className="h-11 w-full bg-[#00694C] sm:w-auto sm:self-end"
                            onClick={handleOpenSummary}
                            disabled={!canTransform || isSubmitting || isFetching}
                          >
                            Transform to Bundles
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {lastResult && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {lastResult.unitsCreated} {lastResult.unitsCreated === 1 ? lastResult.unitLabel : `${lastResult.unitLabel}s`} Created — Generated QRs
                </h2>
                <Button type="button" size="sm" onClick={() => handlePrint(lastResult.labelItems)}>
                  <PrinterIcon className="size-4" />
                  Print All
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {lastResult.labelItems.map((item) => (
                  <QrLabelCard key={item.stockItemId} item={item} className="bg-white" />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <QrPrintSheet items={printItems} />
    </div>
  );
};

export default StockTransformation;

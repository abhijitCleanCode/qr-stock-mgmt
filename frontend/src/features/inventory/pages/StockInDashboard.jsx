import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { ArrowRight, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import ActionModal from "@/components/shared/ActionModal";
import { cn } from "@/lib/utils";
import { STOCK_IN_STEPS } from "../hooks/useStockInWizard";
import { useStockInDashboardApi } from "../hooks/useStockInDashboardApi";
import { useDeleteStockInDraftApi, useStockInDraftsApi } from "../hooks/useStockInDraftsApi";
import { formatDateOnly, formatHistoryDateParts } from "../utils/stockHistoryLabels";

const PRINT_STATUS_PILL = {
  NONE: { className: "border-slate-200 bg-slate-100 text-slate-500", label: () => "No tags" },
  NOT_PRINTED: { className: "border-amber-200 bg-amber-50 text-amber-700", label: () => "Not printed" },
  PARTIAL: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
    label: (row) => `${row.printedCount} of ${row.qrCount} printed`,
  },
  PRINTED: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", label: (row) => `${row.qrCount} printed` },
};

const Sheet = ({ className, children }) => (
  <section
    className={cn("rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:p-8", className)}
  >
    {children}
  </section>
);

const SectionHeading = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <p className="mt-0.5 text-xs text-slate-500 md:text-[13px]">{subtitle}</p>
  </div>
);

const Stat = ({ value, label, highlight }) => (
  <div className="flex-1 basis-1/2 border-b border-slate-200 px-5 py-3.5 md:basis-0 md:border-b-0 md:border-r md:last:border-r-0">
    <div className={cn("font-mono text-xl font-bold", highlight ? "text-amber-700" : "text-slate-900")}>
      {value ?? "—"}
    </div>
    <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
  </div>
);

const ColorDot = ({ hex }) => (
  <span className="size-2.5 flex-none rounded-full ring-1 ring-slate-200" style={{ backgroundColor: hex || "#CBD5E1" }} />
);

const LoadingRow = () => (
  <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
    <Loader2 className="size-4 animate-spin" /> Loading…
  </div>
);

const ErrorRow = ({ message }) => <div className="py-6 text-center text-sm text-red-600">{message}</div>;

const EmptyRow = ({ children }) => <div className="py-6 text-center text-sm text-slate-500">{children}</div>;

function draftTitle(draft) {
  return draft.challanNo || `Draft #${draft.id}`;
}

function draftMeta(draft) {
  const parts = [];
  const variant = draft.primaryVariant;
  if (variant?.designCode) parts.push(variant.designCode);
  if (variant?.colorName) {
    parts.push(draft.variantCount > 1 ? `${variant.colorName} +${draft.variantCount - 1} more` : variant.colorName);
  }
  if (!variant) parts.push("No design selected yet");
  if (draft.jobberName) parts.push(draft.jobberName);
  parts.push(`started ${formatHistoryDateParts(draft.createdAt).date}`);
  return parts.join(" · ");
}

const DraftCard = ({ draft, onResume, onDiscard }) => {
  const stepIndex = Math.min(Math.max(draft.currentStep, 0), STOCK_IN_STEPS.length - 1);
  const progress = ((stepIndex + 1) / STOCK_IN_STEPS.length) * 100;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 px-4 py-4 md:gap-5">
      <ColorDot hex={draft.primaryVariant?.colorHex} />
      <div className="min-w-0 flex-none basis-full sm:basis-72">
        <div className="truncate font-mono text-[13px] font-bold text-slate-900">{draftTitle(draft)}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{draftMeta(draft)}</div>
      </div>
      <div className="min-w-[180px] flex-1">
        <div className="mb-1.5 text-xs text-slate-600">
          Step {stepIndex + 1} of {STOCK_IN_STEPS.length} ·{" "}
          <b className="font-semibold text-slate-900">{STOCK_IN_STEPS[stepIndex].title}</b>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex flex-none items-center gap-3">
        <button
          type="button"
          onClick={() => onDiscard(draft)}
          className="text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          Discard
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onResume(draft)}
          className="gap-1 rounded-lg border-slate-300 text-xs font-semibold text-slate-700"
        >
          Resume <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

const RecentRow = ({ row }) => {
  const pill = PRINT_STATUS_PILL[row.printStatus] ?? PRINT_STATUS_PILL.NONE;

  return (
    <Link
      to={`/qr-center/${row.stockInTransactionId}`}
      className="-mx-2 flex items-center gap-3.5 rounded-lg border-b border-slate-100 px-2 py-3 transition-colors last:border-b-0 hover:bg-slate-50"
    >
      <ColorDot hex={row.variant.colorHex} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[13px] font-semibold text-slate-900">
          {row.challanNo || `#${row.stockInTransactionId}`}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-500">
          {row.design.code} · {row.variant.colorName} · {formatDateOnly(row.stockDate)}
        </div>
      </div>
      <div className="hidden w-20 font-mono text-[13px] text-slate-600 sm:block">{row.pieceCount} pcs</div>
      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
          pill.className,
        )}
      >
        {pill.label(row)}
      </span>
    </Link>
  );
};

const StockInDashboard = () => {
  const navigate = useNavigate();
  const dashboardQuery = useStockInDashboardApi();
  const draftsQuery = useStockInDraftsApi();
  const { mutateAsync: deleteDraft, isPending: isDeleting } = useDeleteStockInDraftApi();
  const [draftToDiscard, setDraftToDiscard] = useState(null);

  const stats = dashboardQuery.data?.data?.stats;
  const recent = dashboardQuery.data?.data?.recent ?? [];
  const drafts = draftsQuery.data?.data ?? [];

  const handleConfirmDiscard = async () => {
    if (!draftToDiscard) return;
    try {
      await deleteDraft(draftToDiscard.id);
      toast.success(`Draft ${draftTitle(draftToDiscard)} discarded.`);
      setDraftToDiscard(null);
    } catch (error) {
      toast.error(error?.message ?? "Couldn't discard draft. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <Sheet>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stock In</h1>
            <p className="mt-0.5 max-w-[64ch] text-xs text-slate-500 md:text-sm">
              Log inward stock from jobbers and get it tagged. Pick up a draft where you left off, or start a fresh
              inward.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => navigate("/stock-in/new")}
            className="gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            New Stock Inward
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:flex-nowrap">
          <Stat value={stats?.batchesThisMonth} label="Batches this month" />
          <Stat value={stats?.piecesThisMonth} label="Pieces logged this month" />
          <Stat value={stats?.draftsInProgress} label="Drafts in progress" highlight={stats?.draftsInProgress > 0} />
          <Stat
            value={stats?.batchesPendingPrint}
            label={stats?.batchesPendingPrint === 1 ? "Batch with tags pending print" : "Batches with tags pending print"}
            highlight={stats?.batchesPendingPrint > 0}
          />
        </div>
        {dashboardQuery.isError && <ErrorRow message={dashboardQuery.error.message} />}
      </Sheet>

      <Sheet>
        <SectionHeading
          title="Continue a draft"
          subtitle="Saved automatically at every step — nothing is lost if you have to step away mid-inward."
        />
        {draftsQuery.isLoading ? (
          <LoadingRow />
        ) : draftsQuery.isError ? (
          <ErrorRow message={draftsQuery.error.message} />
        ) : drafts.length === 0 ? (
          <EmptyRow>No drafts in progress — start a new inward and it will be saved here as you go.</EmptyRow>
        ) : (
          <div className="space-y-2.5">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onResume={() => navigate(`/stock-in/drafts/${draft.id}`)}
                onDiscard={setDraftToDiscard}
              />
            ))}
          </div>
        )}
      </Sheet>

      <Sheet>
        <SectionHeading
          title="Recently completed"
          subtitle="The last few fully logged batches. Full history, filters and reprints live in QR Center."
        />
        {dashboardQuery.isLoading ? (
          <LoadingRow />
        ) : recent.length === 0 ? (
          <EmptyRow>No completed batches yet — they will show up here once logged.</EmptyRow>
        ) : (
          <div>
            {recent.map((row) => (
              <RecentRow key={row.stockInTransactionId} row={row} />
            ))}
          </div>
        )}
        <Link
          to="/qr-center"
          className="block pt-3 text-center text-[13px] font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          View full stock-in history in QR Center →
        </Link>
      </Sheet>

      <ActionModal
        openActionModal={Boolean(draftToDiscard)}
        setOpenActionModal={(open) => !open && setDraftToDiscard(null)}
        locked={isDeleting}
        title="Discard draft?"
        subtitle={
          draftToDiscard
            ? `${draftTitle(draftToDiscard)} and everything entered in it will be permanently removed. No stock is affected.`
            : undefined
        }
      >
        <div className="flex justify-end gap-3 px-6 py-4">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setDraftToDiscard(null)}>
            Keep draft
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmDiscard}
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Discard draft
          </Button>
        </div>
      </ActionModal>
    </div>
  );
};

export default StockInDashboard;

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { ArrowRight, ChevronDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import ActionModal from "@/components/shared/ActionModal";
import { cn } from "@/lib/utils";
import { STOCK_IN_STEPS } from "../hooks/useStockInWizard";
import { useStockInOverviewApi } from "../hooks/useStockInOverviewApi";
import { useDeleteStockInDraftApi } from "../hooks/useStockInDraftsApi";
import { useLogStockInChallanEventApi } from "../hooks/useStockInChallansApi";
import { getStockInChallanApi } from "../services/stockInChallan.api";
import { buildChallanPdf, challanFileName, downloadBlob } from "../utils/challanPdf";
import { formatDateOnly } from "../utils/stockHistoryLabels";
import { DEFAULT_CHALLAN_FILTERS as DEFAULT_FILTERS } from "../utils/challanFilters";
import ChallanRegister from "../components/stock-in/dashboard/ChallanRegister";
import JobberSummary from "../components/stock-in/dashboard/JobberSummary";
import ChallanDrawer from "../components/stock-in/dashboard/ChallanDrawer";
import ChallanPdfPreview from "../components/stock-in/dashboard/ChallanPdfPreview";
import EditChallanDialog from "../components/stock-in/dashboard/EditChallanDialog";
import DropChallanDialog from "../components/stock-in/dashboard/DropChallanDialog";

const TABS = [
  ["register", "Challans"],
  ["jobbers", "By jobber"],
];

// Relative "Synced 12s ago" label. Re-renders on a timer so the age keeps moving.
const SyncStatus = ({ updatedAt, busy }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  let label = "Syncing…";
  if (!busy && updatedAt) {
    const seconds = Math.max(0, Math.round((now - updatedAt) / 1000));
    if (seconds < 5) label = "Synced just now";
    else if (seconds < 60) label = `Synced ${seconds}s ago`;
    else label = `Synced ${Math.round(seconds / 60)} min ago`;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", busy ? "animate-pulse bg-amber-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
};

const StockInDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // One request covers the stats, drafts, next serial and first register page.
  const overviewQuery = useStockInOverviewApi();
  const { mutateAsync: deleteDraft, isPending: isDeleting } = useDeleteStockInDraftApi();
  const { mutate: logEvent } = useLogStockInChallanEventApi();

  const [tab, setTab] = useState("register");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [drawerId, setDrawerId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [dropping, setDropping] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [draftToDiscard, setDraftToDiscard] = useState(null);
  const [draftsOpen, setDraftsOpen] = useState(false);

  const overview = overviewQuery.data;
  const stats = overview?.dashboard?.stats;
  const drafts = overview?.drafts ?? [];
  const nextSerial = overview?.nextSerial?.serial;

  const closeDrawer = useCallback(() => setDrawerId(null), []);

  // Register rows only carry the summary; the challan PDF needs the per-design breakdown too.
  const loadDetail = useCallback(
    async (challan) => (challan.lines ? challan : (await queryClient.fetchQuery({ queryKey: ["stock-in", "challan", challan.id], queryFn: () => getStockInChallanApi(challan.id), staleTime: 0 })).data),
    [queryClient],
  );

  const handlePreview = async (challan) => {
    try {
      setPreviewing(await loadDetail(challan));
    } catch (error) {
      toast.error(error?.message ?? "Couldn't open the challan.");
    }
  };

  const handleDownload = async (challan) => {
    try {
      const detail = await loadDetail(challan);
      const { doc, pageCount } = buildChallanPdf(detail);
      downloadBlob(doc.output("blob"), challanFileName(detail, "pdf"));
      logEvent({ id: detail.id, kind: "PDF" });
      toast.success(`Downloaded ${challanFileName(detail, "pdf")} (${pageCount} page${pageCount > 1 ? "s" : ""}, 148 × 210 mm)`);
    } catch (error) {
      toast.error(error?.message ?? "Couldn't build the PDF.");
    }
  };

  const handleConfirmDiscard = async () => {
    if (!draftToDiscard) return;
    try {
      await deleteDraft(draftToDiscard.id);
      toast.success(`Draft #${draftToDiscard.id} discarded.`);
      setDraftToDiscard(null);
    } catch (error) {
      toast.error(error?.message ?? "Couldn't discard draft. Please try again.");
    }
  };

  const openJobber = (jobberName) => {
    setFilters({ ...DEFAULT_FILTERS, jobber: jobberName });
    setTab("register");
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["stock-in"] });
  };

  const kpis = [
    { value: stats?.batchesThisMonth, label: "Challans this month" },
    { value: stats?.piecesThisMonth?.toLocaleString("en-IN"), label: "Pieces received this month" },
    { value: stats?.draftsInProgress, label: "Drafts in progress", tone: "blue", onClick: drafts.length ? () => setDraftsOpen(true) : undefined },
    {
      value: stats?.batchesPendingPrint,
      label: "Challans with tags to print",
      tone: "amber",
      onClick: () => {
        setFilters({ ...DEFAULT_FILTERS, tagState: "pending" });
        setTab("register");
        document.getElementById("challan-register-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock In</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            <SyncStatus updatedAt={overviewQuery.dataUpdatedAt} busy={overviewQuery.isFetching} />
            <button type="button" onClick={refreshAll} className="rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold text-emerald-700 hover:bg-emerald-50">
              Refresh
            </button>
          </div>
        </div>
        <Button type="button" onClick={() => navigate("/stock-in/new")} className="ml-auto gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
          <Plus className="size-4" /> New Stock Inward
        </Button>
      </header>

      {/* Four numbers in one strip: two columns on phones, a single row from `sm` up. */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const highlight = kpi.tone === "amber" && kpi.value > 0;
          const Tag = kpi.onClick ? "button" : "div";
          return (
            <Tag
              key={kpi.label}
              type={kpi.onClick ? "button" : undefined}
              onClick={kpi.onClick}
              className={cn("flex flex-col gap-0.5 bg-white px-4 py-3 text-left", kpi.onClick && "hover:bg-slate-50")}
            >
              <span className={cn("font-mono text-xl font-bold leading-tight", highlight ? "text-amber-700" : kpi.tone === "blue" && kpi.value > 0 ? "text-blue-700" : "text-slate-900")}>
                {kpi.value ?? "—"}
              </span>
              <span className="text-[12.5px] text-slate-500">{kpi.label}</span>
            </Tag>
          );
        })}
      </section>
      {overviewQuery.isError && <div className="text-center text-sm text-red-600">{overviewQuery.error.message}</div>}

      {/* Drafts collapse into one line. They're occasional work, not the main job of this page. */}
      {drafts.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button type="button" aria-expanded={draftsOpen} onClick={() => setDraftsOpen((open) => !open)} className="flex min-h-12 w-full items-center gap-2.5 px-4 py-2.5 text-left">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">{drafts.length}</span>
            <span className="font-semibold text-slate-900">Drafts in progress</span>
            <span className="hidden text-[13px] text-slate-500 md:inline">· not added to stock yet, no serial no. issued</span>
            <ChevronDown className={cn("ml-auto size-4 text-slate-500 transition-transform", draftsOpen && "rotate-180")} />
          </button>
          {draftsOpen && (
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-t border-slate-200">
              {drafts.map((draft) => {
                const step = Math.min(Math.max(draft.currentStep, 0), STOCK_IN_STEPS.length - 1);
                return (
                  <div key={draft.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-mono text-[12.8px] font-bold text-slate-900">
                          {draft.challanNo || <span className="font-sans font-medium text-slate-500">Challan no. not entered yet</span>}
                        </span>
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">Draft #{draft.id}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                        <span className="flex gap-0.5">
                          {STOCK_IN_STEPS.map((_, index) => (
                            <i key={index} className={cn("h-1 w-3.5 rounded-sm", index <= step ? "bg-blue-500" : "bg-slate-200")} />
                          ))}
                        </span>
                        Step {step + 1} of {STOCK_IN_STEPS.length} · {STOCK_IN_STEPS[step].title}
                        {draft.jobberName ? ` · ${draft.jobberName}` : ""} · started {formatDateOnly(String(draft.createdAt).slice(0, 10))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDraftToDiscard(draft)} className="text-xs">Discard</Button>
                      <Button type="button" size="sm" onClick={() => navigate(`/stock-in/drafts/${draft.id}`)} className="gap-1 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
                        Continue <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section id="challan-register-card" className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-3.5 py-3">
          <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-[3px]">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn("h-7 rounded-md px-3.5 text-[13px] font-medium text-slate-500", tab === value && "bg-white font-semibold text-slate-900 shadow-sm")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3.5 sm:p-4">
          {tab === "register" ? (
            // Wait for the overview so the register's first page comes from it, not a second request.
            // If the overview fails, the register loads on its own.
            overviewQuery.isPending ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" /> Loading challans…
              </div>
            ) : (
              <ChallanRegister
                filters={filters}
                onFiltersChange={setFilters}
                onView={(challan) => setDrawerId(challan.id)}
                onPrint={handlePreview}
                onPdf={handleDownload}
                onEdit={setEditing}
                onDrop={setDropping}
              />
            )
          ) : (
            <JobberSummary onOpenJobber={openJobber} />
          )}
        </div>
      </section>

      <ChallanDrawer
        challanId={drawerId}
        onClose={closeDrawer}
        onEdit={setEditing}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />

      {previewing && (
        <ChallanPdfPreview challan={previewing} onClose={() => setPreviewing(null)} onActivity={(kind) => logEvent({ id: previewing.id, kind })} />
      )}
      {editing && <EditChallanDialog challan={editing} onClose={() => setEditing(null)} />}
      {dropping && <DropChallanDialog challan={dropping} nextSerial={nextSerial} onClose={() => setDropping(null)} />}

      <ActionModal
        openActionModal={Boolean(draftToDiscard)}
        setOpenActionModal={(open) => !open && setDraftToDiscard(null)}
        locked={isDeleting}
        title={draftToDiscard ? `Discard draft #${draftToDiscard.id}?` : "Discard draft?"}
        subtitle="It was never completed, so no stock or QR tags are affected. Everything entered in it will be permanently removed."
      >
        <div className="flex justify-end gap-3 px-6 py-4">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setDraftToDiscard(null)}>Keep draft</Button>
          <Button type="button" disabled={isDeleting} onClick={handleConfirmDiscard} className="gap-2 bg-red-600 text-white hover:bg-red-700">
            {isDeleting && <Loader2 className="size-4 animate-spin" />} Discard draft
          </Button>
        </div>
      </ActionModal>
    </div>
  );
};

export default StockInDashboard;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { bulkPreviewDesignsApi, registerDesignApi } from "../services/design.api.js";
import { BULK_MAX_DESIGNS, BULK_TEMPLATE_CSV, buildBulkPlan } from "../utils/bulkDesignImport.js";
import { createPlaceholderPhoto } from "../utils/placeholderPhoto.js";

const Sheet = ({ children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:p-7 ${className}`}>{children}</section>
);

const STATUS = {
  new: { label: "Will import", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  exists: { label: "Already exists · skipped", className: "bg-slate-100 text-slate-600 border-slate-200" },
  error: { label: "Has errors · skipped", className: "bg-red-50 text-red-700 border-red-200" },
  imported: { label: "Imported", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
};

const Pill = ({ status }) => (
  <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS[status].className}`}>{STATUS[status].label}</span>
);

const downloadTemplate = () => {
  const url = URL.createObjectURL(new Blob([BULK_TEMPLATE_CSV], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "design-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

// Design Master bulk import. Reads one CSV (one row per colour variant), checks everything first,
// then registers each new design through the same endpoint the single-design form uses. Every
// variant starts with a placeholder photo; designs whose code already exists are skipped.
const BulkDesignImport = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState("");
  const [checked, setChecked] = useState(null); // { plan, existing: Set, newLookups }
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [results, setResults] = useState(null); // { code, status, message }[]

  const rows = useMemo(() => {
    if (!checked) return [];
    return checked.plan.designs.map((design) => {
      if (design.errors.length > 0) return { ...design, status: "error" };
      if (checked.existing.has(design.code.toLowerCase())) return { ...design, status: "exists" };
      return { ...design, status: "new" };
    });
  }, [checked]);

  const toImport = rows.filter((design) => design.status === "new");
  const fileBlocked = checked ? checked.plan.fileErrors.length > 0 : false;
  const isImporting = progress !== null;

  const handleCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
    setCsvName(file.name);
    setChecked(null);
    setResults(null);
  };

  const handleCheck = async () => {
    if (!csvText) return toast.error("Choose the CSV file first.");
    const plan = buildBulkPlan(csvText, await createPlaceholderPhoto());
    setResults(null);

    const candidates = plan.designs.filter((design) => design.payload);
    if (plan.fileErrors.length > 0 || candidates.length === 0) {
      setChecked({ plan, existing: new Set(), newLookups: {} });
      return;
    }

    setIsChecking(true);
    try {
      const response = await bulkPreviewDesignsApi(
        candidates.map(({ payload }) => ({
          code: payload.code,
          pattern: payload.name,
          itemName: payload.itemName,
          quality: payload.quality,
          jobberName: payload.jobberName,
        })),
      );
      const existing = new Set(response.data.designs.filter((design) => design.exists).map((design) => design.code.toLowerCase()));
      setChecked({ plan, existing, newLookups: response.data.newLookups });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleImport = async () => {
    const batch = toImport.map((design) => design.payload);
    const outcome = [];
    setProgress({ done: 0, total: batch.length });

    // One design per request, in order: a failure is recorded and the rest carry on. Re-running
    // the import is safe — designs that were saved are now "already exists" and get skipped.
    for (const payload of batch) {
      try {
        await registerDesignApi(payload);
        outcome.push({ code: payload.code, status: "imported", message: "" });
      } catch (error) {
        outcome.push({ code: payload.code, status: "failed", message: error.message });
      }
      setProgress((current) => ({ ...current, done: current.done + 1 }));
    }

    setResults(outcome);
    setProgress(null);
    queryClient.invalidateQueries({ queryKey: ["designs"] });
    const imported = outcome.filter((item) => item.status === "imported").length;
    toast[imported === outcome.length ? "success" : "warning"](`Imported ${imported} of ${outcome.length} designs.`);
  };

  const counts = {
    new: rows.filter((design) => design.status === "new").length,
    exists: rows.filter((design) => design.status === "exists").length,
    error: rows.filter((design) => design.status === "error").length,
  };
  const newLookupEntries = checked
    ? [
        ["Jobbers", checked.newLookups.jobbers],
        ["Qualities", checked.newLookups.qualities],
        ["Patterns", checked.newLookups.patterns],
        ["Item names", checked.newLookups.itemNames],
      ].filter(([, names]) => names?.length > 0)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <Sheet>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Bulk import designs</h1>
            <p className="mt-1 max-w-[70ch] text-sm text-slate-500">
              Upload a CSV with one row per colour variant. Nothing is saved until you press Import. Up to {BULK_MAX_DESIGNS} designs per file.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate("/designs")} className="gap-2 rounded-full">
            <ArrowLeft className="size-4" /> Back to Design Master
          </Button>
        </div>
      </Sheet>

      <Sheet>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-slate-800">1. Designs file (CSV)</span>
          <input type="file" accept=".csv,text/csv" onChange={handleCsv} disabled={isImporting} className="text-sm" />
          {csvName && <span className="text-xs text-slate-500"><FileSpreadsheet className="mr-1 inline size-3.5" />{csvName}</span>}
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="w-fit gap-1.5">
            <Download className="size-3.5" /> Download template
          </Button>
          <p className="text-xs text-slate-500">
            Photos are not needed here. Each variant is imported with a "Photo pending" placeholder, and you add its real photo from the design's edit page.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleCheck} disabled={!csvText || isChecking || isImporting} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            {isChecking ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Check file
          </Button>
        </div>
      </Sheet>

      {checked && (
        <Sheet>
          {checked.plan.fileErrors.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <b className="block">The file can't be imported yet:</b>
              <ul className="mt-1 list-disc pl-5">{checked.plan.fileErrors.map((message) => <li key={message}>{message}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{counts.new} to import</span>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{counts.exists} already exist (skipped)</span>
            <span className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-700">{counts.error} with errors (skipped)</span>
          </div>

          {newLookupEntries.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <b className="block">These names are new and will be added to the lists. Check for typos before importing:</b>
              <ul className="mt-1 flex flex-col gap-1">
                {newLookupEntries.map(([label, names]) => (
                  <li key={label}><span className="font-semibold">{label}:</span> {names.join(", ")}</li>
                ))}
              </ul>
            </div>
          )}


          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Design code</th>
                  <th className="px-3 py-2.5">Pattern · Item · Quality</th>
                  <th className="px-3 py-2.5">Variants</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((design) => (
                  <tr key={design.code} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{design.code}</td>
                    <td className="px-3 py-2.5 text-slate-700">{design.payload ? `${design.payload.name} · ${design.payload.itemName} · ${design.payload.quality}` : "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{design.rowCount}</td>
                    <td className="px-3 py-2.5">
                      <Pill status={design.status} />
                      {design.errors.length > 0 && (
                        <ul className="mt-1.5 list-disc pl-4 text-xs text-red-600">{design.errors.map((message) => <li key={message}>{message}</li>)}</ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleImport}
              disabled={fileBlocked || toImport.length === 0 || isImporting}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isImporting && <Loader2 className="size-4 animate-spin" />}
              {isImporting ? `Importing ${progress.done} of ${progress.total}…` : `Import ${toImport.length} design${toImport.length === 1 ? "" : "s"}`}
            </Button>
            {isImporting && <span className="text-xs text-slate-500">Keep this page open until the import finishes.</span>}
          </div>
        </Sheet>
      )}

      {results && (
        <Sheet>
          <h2 className="text-[16px] font-bold text-slate-900">Import result</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {results.map((item) => (
              <li key={item.code} className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{item.code}</span>
                <Pill status={item.status} />
                {item.message && <span className="text-xs text-red-600">{item.message}</span>}
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
};

export default BulkDesignImport;

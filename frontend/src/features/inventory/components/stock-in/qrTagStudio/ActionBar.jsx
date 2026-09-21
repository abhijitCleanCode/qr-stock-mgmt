import { Button } from "@/components/ui/button";

const ActionBar = ({ totals, onSavePreset, onDownloadPdf, onSkip, onSendToPrinter, isSavingPreset }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex flex-wrap gap-6">
      <div>
        <div className="font-mono text-base font-bold tabular-nums text-slate-900">{totals.tagsQueued}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tags queued</div>
      </div>
      <div>
        <div className="font-mono text-base font-bold tabular-nums text-slate-900">{totals.media}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Media</div>
      </div>
      {/* <div>
        <div className="font-mono text-base font-bold tabular-nums text-slate-900">{totals.applyTime}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Est. apply time</div>
      </div> */}
      <div>
        <div className={`font-mono text-base font-bold tabular-nums ${totals.issues ? "text-amber-600" : "text-slate-900"}`}>{totals.issues}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Need attention</div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onSavePreset} disabled={isSavingPreset} className="rounded-lg border-slate-200 text-xs font-semibold text-slate-700">
        {isSavingPreset ? "Saving…" : "Save as preset"}
      </Button>
      <Button type="button" variant="outline" onClick={onDownloadPdf} className="rounded-lg border-slate-200 text-xs font-semibold text-slate-700">
        Download PDF
      </Button>
      <Button type="button" variant="outline" onClick={onSkip} className="rounded-lg border-slate-200 text-xs font-semibold text-slate-700">
        Skip · send to QR Center
      </Button>
      <Button type="button" onClick={onSendToPrinter} className="gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
        Send to printer →
      </Button>
    </div>
  </div>
);

export default ActionBar;

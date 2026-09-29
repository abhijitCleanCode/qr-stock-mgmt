// Shows the document exactly as it will print, using the same HTML the print path uses, so what
// is on screen and what comes out of the printer can never drift apart. Rendered in a sandboxed
// iframe rather than inline: the print stylesheet assumes it owns the page, and inlining it would
// leak those rules into the app.
const DocumentPreview = ({ html }) => (
    <div className="glass-card rounded-[24px] p-6">
        <iframe
            title="Document preview"
            sandbox=""
            className="h-[880px] w-full rounded-xl border border-white/60 bg-white"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8">
<style>
  @page { size:A4; margin:14mm; }
  * { box-sizing:border-box; }
  body { margin:0; padding:34px 38px; font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif; font-size:12.5px; color:#0F172A; background:#fff; }
  .doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0F172A; padding-bottom:12px; }
  .doc-title { font-size:20px; font-weight:700; }
  .doc-sub { font-size:11.5px; color:#64748B; margin-top:2px; }
  .doc-no-label { font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#64748B; text-align:right; }
  .doc-no { font-family:ui-monospace,Menlo,monospace; font-size:16px; font-weight:700; text-align:right; }
  .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 20px; margin:16px 0 18px; }
  .meta .k { font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#64748B; }
  .meta .v { font-weight:600; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { text-align:left; font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; color:#475569; border-bottom:1.5px solid #0F172A; padding:7px 8px; }
  td { border-bottom:1px solid #E2E8F0; padding:8px; }
  td.n, th.n { text-align:right; font-family:ui-monospace,Menlo,monospace; }
  tr.group td { background:#F1F5F9; font-weight:700; font-size:11px; padding:6px 8px; }
  tr.total td { border-top:1.5px solid #0F172A; border-bottom:0; font-weight:700; }
  .notes { margin-top:14px; font-size:11.5px; }
  .sign { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:52px; }
  .sign div { border-top:1px solid #0F172A; padding-top:6px; font-size:10.5px; color:#475569; text-align:center; }
  .foot { margin-top:22px; font-size:10px; color:#94A3B8; display:flex; justify-content:space-between; }
  .tag { font-size:9px; font-weight:700; color:#6D28D9; }
</style></head><body>${html}</body></html>`}
        />
    </div>
);

export default DocumentPreview;

// Prints one element by writing it into a detached iframe, rather than toggling print CSS on the
// whole app. The app's layout is a fixed sidebar plus a scrolling pane, which a print stylesheet
// has to fight; an iframe simply has none of that.
export function printHtml(title, html) {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Inter, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:12.5px; color:#0F172A; }
  .doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0F172A; padding-bottom:12px; }
  .doc-title { font-size:20px; font-weight:700; }
  .doc-sub { font-size:11.5px; color:#64748B; margin-top:2px; }
  .doc-no-label { font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#64748B; text-align:right; }
  .doc-no { font-family: ui-monospace, Menlo, monospace; font-size:16px; font-weight:700; text-align:right; }
  .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 20px; margin:16px 0 18px; }
  .meta .k { font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#64748B; }
  .meta .v { font-weight:600; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { text-align:left; font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; color:#475569; border-bottom:1.5px solid #0F172A; padding:7px 8px; }
  td { border-bottom:1px solid #E2E8F0; padding:8px; }
  td.n, th.n { text-align:right; font-family: ui-monospace, Menlo, monospace; }
  tr.group td { background:#F1F5F9; font-weight:700; font-size:11px; padding:6px 8px; }
  tr.total td { border-top:1.5px solid #0F172A; border-bottom:0; font-weight:700; }
  .notes { margin-top:14px; font-size:11.5px; }
  .sign { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:52px; }
  .sign div { border-top:1px solid #0F172A; padding-top:6px; font-size:10.5px; color:#475569; text-align:center; }
  .foot { margin-top:22px; font-size:10px; color:#94A3B8; display:flex; justify-content:space-between; }
  .tag { font-size:9px; font-weight:700; color:#6D28D9; }
</style></head><body>${html}</body></html>`);
    doc.close();

    const cleanup = () => setTimeout(() => frame.remove(), 500);

    frame.contentWindow.addEventListener("afterprint", cleanup);
    // Give the iframe a tick to lay out before printing, or the first page can come out blank.
    setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        // Safari never fires afterprint from an iframe, so this is the backstop.
        setTimeout(cleanup, 60000);
    }, 120);
}

export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
    ));
}

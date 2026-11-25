import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Ban, Check, ChevronDown, Download, Loader2, Lock, Pencil, Printer, QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStockInChallanApi } from "../../../hooks/useStockInChallansApi";
import { formatDateOnly, formatHistoryDateParts } from "../../../utils/stockHistoryLabels";

const EVENT_LABEL = { PRINT: "Printed", PDF: "PDF downloaded", EDIT: "Edited", DROP: "Dropped" };

const sumOf = (values) => values.reduce((total, value) => total + value, 0);

// Sets, semi sets and loose pieces for one variant, per size. A set and a semi set both count
// toward every size they contain, so a size's column is its total pieces in that size.
const perSize = (line) =>
  Object.fromEntries(
    line.sizes.map((size) => [
      size,
      line.sets + sumOf(line.semiSets.filter((semi) => semi.sizes.includes(size)).map((semi) => semi.quantity)) + (line.loose[size] ?? 0),
    ]),
  );

// Field in the details box: small caps label over the value.
const Detail = ({ label, mono, children }) => (
  <div className="min-w-0">
    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={cn("mt-0.5 truncate text-[13.5px] font-semibold text-slate-900", mono && "font-mono")}>{children}</div>
  </div>
);

// Items tab: one group per design, one row per colour variant. Tapping a row shows its breakdown.
const StockCount = ({ challan }) => {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (transactionId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(transactionId)) next.delete(transactionId);
      else next.add(transactionId);
      return next;
    });

  const groups = [...new Set(challan.lines.map((line) => line.designCode))];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-[13px]">
        <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2.5 text-left">Design · variant</th>
            <th className="px-2 py-2.5 text-center">Sets</th>
            <th className="px-2 py-2.5 text-center">Semi sets</th>
            <th className="px-2 py-2.5 text-center">Loose</th>
            <th className="px-2 py-2.5 text-center">Total pcs</th>
            <th className="w-8 px-2 py-2.5"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((code) => {
            const lines = challan.lines.filter((line) => line.designCode === code);
            return [
              <tr key={`group-${code}`} className="bg-slate-50">
                <td colSpan={6} className="px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-700">
                  {code} · {lines[0].designName}
                </td>
              </tr>,
              ...lines.map((line) => {
                const expanded = open.has(line.transactionId);
                return [
                  <tr
                    key={line.transactionId}
                    onClick={() => toggle(line.transactionId)}
                    className={cn("cursor-pointer border-t border-slate-100 hover:bg-slate-50", expanded && "bg-slate-50/60")}
                  >
                    <td className="px-3 py-2.5 text-slate-900">
                      <span className="mr-2.5 inline-block size-2.5 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: line.colorHex }} />
                      {line.colorName}
                    </td>
                    <td className={cn("text-center font-mono font-semibold", !line.sets && "text-slate-300")}>{line.sets || "–"}</td>
                    <td className={cn("text-center font-mono font-semibold", !line.semiSetCount && "text-slate-300")}>{line.semiSetCount || "–"}</td>
                    <td className={cn("text-center font-mono font-semibold", !line.loosePieces && "text-slate-300")}>{line.loosePieces || "–"}</td>
                    <td className="text-center font-mono font-bold text-slate-900">{line.pieces}</td>
                    <td className="px-2 text-center">
                      <ChevronDown className={cn("mx-auto size-3.5 text-slate-400 transition-transform", expanded && "rotate-180")} />
                    </td>
                  </tr>,
                  expanded && (
                    <tr key={`${line.transactionId}-detail`} className="bg-slate-50/60">
                      <td colSpan={6} className="px-3 pb-3 pt-1">
                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-3 text-[12.5px] sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Sets</div>
                            <div className="font-mono text-slate-900">{line.sets ? `${line.sets} × ${line.sizes.join("-")}` : "—"}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Semi sets</div>
                            <div className="font-mono text-slate-900">
                              {line.semiSets.length ? line.semiSets.map((semi) => <div key={semi.sizes.join("-")}>{semi.quantity} × {semi.sizes.join("-")}</div>) : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Loose</div>
                            <div className="font-mono text-slate-900">
                              {line.loosePieces ? Object.entries(line.loose).filter(([, qty]) => qty).map(([size, qty]) => `${size} ${qty}`).join(" · ") : "—"}
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Size-wise</div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(perSize(line)).map(([size, qty]) => (
                                <span key={size} className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-500">
                                  {size} <b className="text-slate-900">{qty}</b>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              }),
            ];
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-emerald-50 font-bold text-emerald-900">
            <td className="px-3 py-2.5">Total</td>
            <td className="text-center font-mono">{challan.sets}</td>
            <td className="text-center font-mono">{challan.semiSets}</td>
            <td className="text-center font-mono">{challan.loosePieces}</td>
            <td className="text-center font-mono">{challan.totalPieces}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// QC tab: a pass/defect bar, then one card per design that has defective pieces.
const QcView = ({ challan }) => {
  const defectLines = challan.lines.filter((line) => line.defective > 0);
  const defective = sumOf(defectLines.map((line) => line.defective));
  const passed = challan.totalPieces - defective;
  const returned = challan.defectAction === "return";

  if (defectLines.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-800">
        <Check className="size-5 shrink-0" />
        <div>
          <div className="text-[14.5px] font-semibold">All {challan.totalPieces} pcs passed</div>
          <div className="text-[12.5px] opacity-80">No defects found at stock-in</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold leading-none text-red-600">{defective}</span>
          <span className="text-[11.5px] leading-tight text-slate-500">defective<br />of {challan.totalPieces} pcs</span>
        </div>
        <div className="min-w-[160px] flex-1">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100">
            <i className="block bg-emerald-500" style={{ flex: passed }} />
            <i className="block bg-red-500" style={{ flex: defective }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[12px] text-slate-500">
            <span><i className="mr-1.5 inline-block size-2 rounded-sm bg-emerald-500" />{passed} passed</span>
            <span><i className="mr-1.5 inline-block size-2 rounded-sm bg-red-500" />{defective} {returned ? "returned" : "kept"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {defectLines.map((line) => (
          <div key={line.transactionId} className="flex items-center gap-3.5 rounded-xl border border-slate-200 border-l-4 border-l-red-500 bg-white py-3 pl-3 pr-4">
            <span className="w-9 shrink-0 text-center font-mono text-2xl font-bold leading-none text-red-600">{line.defective}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">
                <span className="size-2.5 shrink-0 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: line.colorHex }} />
                <span className="truncate">{line.designCode} · {line.colorName}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-red-600">
                <AlertTriangle className="size-3.5 shrink-0" /> {line.defectCategory ?? "Defect"}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold",
                returned ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700",
              )}
            >
              {returned ? "Returned to jobber" : "Kept as seconds"}
            </span>
          </div>
        ))}
      </div>

      {challan.remarks && (
        <p className="border-l-[3px] border-slate-200 pl-3 text-[13px] italic text-slate-600">“{challan.remarks}”</p>
      )}
    </div>
  );
};

const ChallanDrawer = ({ challanId, onClose, onEdit, onDrop, onPreview, onDownload }) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useStockInChallanApi(challanId);
  const challan = data?.data;
  const open = Boolean(challanId);
  const dropped = challan?.status === "DROPPED";
  // Tab and history state are remembered per challan; every challan opens on Items with history closed.
  const [view, setView] = useState({ id: null, tab: "items", historyOpen: false });
  const current = view.id === challanId ? view : { id: challanId, tab: "items", historyOpen: false };
  const tab = current.tab;
  const historyOpen = current.historyOpen;
  const setTab = (next) => setView({ ...current, tab: next });
  const setHistoryOpen = (update) => setView({ ...current, historyOpen: typeof update === "function" ? update(current.historyOpen) : update });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const history = challan
    ? [
        { at: challan.createdAt, text: <>Entered{challan.enteredBy ? <> by <b>{challan.enteredBy}</b></> : null}</> },
        ...challan.events.map((event) => ({
          at: event.createdAt,
          text: (
            <>
              {EVENT_LABEL[event.kind] ?? event.kind}
              {event.actor ? <> by <b>{event.actor}</b></> : null}
              {event.note ? <> — {event.note}</> : null}
              {event.changes?.length > 0 && (
                <div className="mt-0.5 text-xs text-slate-600">
                  {event.changes.map((change) => (
                    <div key={change.field}>
                      {change.field}: <s className="text-slate-400">{change.from || "—"}</s> → <b>{change.to || "—"}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          ),
        })),
      ].sort((a, b) => new Date(a.at) - new Date(b.at))
    : [];

  const defectiveTotal = challan ? sumOf(challan.lines.map((line) => line.defective ?? 0)) : 0;
  const qrPrinted = challan?.printedCount ?? 0;
  const qrTotal = challan?.qrCount ?? 0;

  return (
    <>
      <div
        onClick={onClose}
        className={cn("fixed inset-0 z-40 bg-slate-900/40 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Challan details"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Sr. no. {challan?.serialLabel ?? "…"}{dropped ? " · dropped" : ""} · jobber challan
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xl font-bold text-slate-900">{challan?.challanNo ?? "—"}</span>
              {dropped && <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-600">DROPPED</span>}
              {challan?.edited && <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-blue-700">EDITED</span>}
            </div>
            {challan && (
              <div className="mt-1 text-[13px] text-slate-500">
                {challan.jobberName ?? "—"} · {formatDateOnly(challan.stockDate)} · <span className="font-mono">{challan.totalPieces}</span> pcs
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}
          {isError && <div className="py-10 text-center text-sm text-red-600">{error.message}</div>}

          {challan && (
            <>
              {dropped && (
                <div className="mb-5 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-900">
                  <Ban className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <b>Dropped</b> — {challan.voidReason}. Serial no. <b>{challan.serialLabel}</b> is retired and will never be reused. Its stock was removed and its QR tags retired.
                  </div>
                </div>
              )}

              <div className="mb-5 grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <Detail label="Serial no." mono>{challan.serialLabel}</Detail>
                <Detail label="Jobber">{challan.jobberName ?? "—"}</Detail>
                <Detail label="Jobber challan no." mono>{challan.challanNo}</Detail>
                <Detail label="Inward date">{formatDateOnly(challan.stockDate)}</Detail>
                <Detail label="Issued challan no." mono>{challan.issuedChallanNo || <span className="font-sans font-medium text-slate-400">Not recorded</span>}</Detail>
                <Detail label="Entered by">{challan.enteredBy ?? "—"}</Detail>
              </div>

              {/* Items / QC switch: the counts sit on the tabs so both are visible before opening one. */}
              <div role="tablist" className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "items"}
                  onClick={() => setTab("items")}
                  className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium text-slate-500", tab === "items" && "bg-white font-semibold text-slate-900 shadow-sm")}
                >
                  Items <span className="font-mono text-[11.5px] text-slate-400">{challan.totalPieces} pcs</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "qc"}
                  onClick={() => setTab("qc")}
                  className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium text-slate-500", tab === "qc" && "bg-white font-semibold text-slate-900 shadow-sm")}
                >
                  QC &amp; defects
                  <span className={cn("font-mono text-[11.5px]", defectiveTotal ? "font-bold text-red-600" : "text-emerald-600")}>
                    {defectiveTotal ? `${defectiveTotal} defective` : "all passed"}
                  </span>
                </button>
              </div>

              {tab === "items" ? (
                <>
                  <div className="mb-2 text-[12px] text-slate-400">Tap a row for sets, semi sets and sizes</div>
                  <StockCount challan={challan} />
                </>
              ) : (
                <QcView challan={challan} />
              )}

              <button
                type="button"
                onClick={() => navigate(`/qr-center?challan=${encodeURIComponent(challan.challanNo)}`)}
                className="mt-5 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-[13.5px] text-slate-700 hover:bg-slate-50"
              >
                <QrCode className="size-4 text-slate-500" />
                QR tags · <b className="font-mono text-slate-900">{qrPrinted}/{qrTotal}</b> printed
                <span className="ml-auto text-[13px] font-semibold text-emerald-700">Open in QR Center →</span>
              </button>

              <div className="mt-5">
                <button
                  type="button"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", historyOpen && "rotate-180")} />
                  History · {history.length} entr{history.length === 1 ? "y" : "ies"}
                </button>
                {historyOpen && (
                  <div className="mt-2 border-l-2 border-slate-200 pl-4">
                    {history.map((entry, index) => {
                      const parts = formatHistoryDateParts(entry.at);
                      return (
                        <div key={index} className="relative grid grid-cols-[84px_1fr] gap-3 py-2.5 text-[13px]">
                          <span className="absolute -left-[21px] top-3.5 size-2 rounded-full bg-slate-400" />
                          <span className="text-[12px] leading-snug text-slate-400">{parts.date}<br />{parts.time}</span>
                          <div className="text-slate-800">{entry.text}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {challan && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3 sm:px-6">
            <Button type="button" variant="outline" size="sm" onClick={() => onPreview(challan)} className="gap-1.5"><Printer className="size-3.5" /> Print</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onDownload(challan)} className="gap-1.5"><Download className="size-3.5" /> Download PDF</Button>
            <span className="flex-1" />
            {dropped ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-500"><Lock className="size-3" /> Dropped challans are read-only</span>
            ) : (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(challan)} className="gap-1.5"><Pencil className="size-3.5" /> Edit details</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onDrop(challan)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"><Ban className="size-3.5" /> Drop challan</Button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default ChallanDrawer;

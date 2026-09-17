import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQrCenterResolveApi } from "../../../hooks/useQrCenterResolveApi";
import { useQrCenterReferenceApi } from "../../../hooks/useQrCenterReferenceApi";
import { useCreateQrCenterReprintApi, useBulkPrintReprintsApi } from "../../../hooks/useQrCenterReprintsApi";
import { useBreakSetApi } from "../../../hooks/useBreakSetApi";
import { fmtINR } from "../../../utils/qrCenterConstants";
import { PrimaryButton, SecondaryButton, VariantDot, Eyebrow, NativeSelect } from "../ui/qrcUi";

const RECENT_CODES_KEY = "qrCenter.recentCodes";
const BREAK_SET_REASONS = ["TOUR", "DISPLAY", "GIFT", "DAMAGE"];

function readRecentCodes() {
    try {
        const raw = window.localStorage.getItem(RECENT_CODES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function pushRecentCode(code) {
    try {
        const current = readRecentCodes().filter((c) => c !== code);
        const next = [code, ...current].slice(0, 6);
        window.localStorage.setItem(RECENT_CODES_KEY, JSON.stringify(next));
        return next;
    } catch {
        return readRecentCodes();
    }
}

export default function ResolverSection({ onGotoTab }) {
    const [inputValue, setInputValue] = useState("");
    const [recentCodes, setRecentCodes] = useState(() => readRecentCodes());
    const debouncedInput = useDebouncedValue(inputValue, 300);
    const trimmed = debouncedInput.trim().toUpperCase();

    const { data: resolveResponse, isFetching, isError, error } = useQrCenterResolveApi(trimmed);
    const result = resolveResponse?.data;

    useEffect(() => {
        if (result?.state && result.state !== "UNKNOWN") {
            const code = result.set?.shortCode || result.piece?.shortCode || result.retired?.shortCode || result.duplicate?.shortCode || result.rack?.code || trimmed;
            if (code) setRecentCodes(pushRecentCode(code));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result?.state]);

    const chips = recentCodes.length > 0 ? recentCodes : [];

    const handleChipClick = (code) => setInputValue(code);

    return (
        <section className="mb-6">
            <div className="bg-white border border-[var(--qrc-line)] rounded-[10px] p-4 sm:p-5">
                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--qrc-ink4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
                    </svg>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Scan a QR or type any code — set, piece, rack, challan"
                        className="qrc-resolver-input qrc-mono w-full h-14 pl-12 pr-4 rounded-[10px] border border-[var(--qrc-line-strong)] bg-white text-[16px] text-[var(--qrc-ink)] placeholder:text-[var(--qrc-ink4)] placeholder:font-sans transition-shadow"
                        autoFocus
                    />
                </div>
                {chips.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-[11px] text-[var(--qrc-ink4)] font-medium mr-1">Recent:</span>
                        {chips.map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => handleChipClick(code)}
                                className={`qrc-mono text-[12px] font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                                    trimmed === code
                                        ? "bg-[var(--qrc-accent-bg)] border-[var(--qrc-accent-border)] text-[var(--qrc-accent-hover)]"
                                        : "bg-[var(--qrc-sunken)] border-[var(--qrc-line)] text-[var(--qrc-ink2)] hover:border-[var(--qrc-line-strong)]"
                                }`}
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                )}
                <div className="mt-4">
                    {trimmed && isFetching && (
                        <div className="text-[13px] text-[var(--qrc-ink3)] px-1 py-2">Resolving…</div>
                    )}
                    {trimmed && !isFetching && isError && (
                        <div className="rounded-[10px] border border-[var(--qrc-danger-border)] bg-[var(--qrc-danger-bg)] p-4 text-[13px] text-[var(--qrc-danger)]">
                            Couldn't resolve this code — {error?.message ?? "the QR Center service is unavailable."}
                        </div>
                    )}
                    {trimmed && !isFetching && !isError && result && (
                        <ResolverResult result={result} onGotoTab={onGotoTab} onChip={handleChipClick} />
                    )}
                </div>
            </div>
        </section>
    );
}

function ResolverResult({ result, onGotoTab, onChip }) {
    switch (result.state) {
        case "SET":
            return <ResultSet r={result.set} />;
        case "PIECE":
            return <ResultPiece r={result.piece} onChip={onChip} />;
        case "RETIRED":
            return <ResultRetired r={result.retired} onChip={onChip} />;
        case "UNKNOWN":
            return <ResultUnknown r={result} onGotoTab={onGotoTab} />;
        case "DUPLICATE":
            return <ResultDuplicate r={result.duplicate} />;
        case "RACK":
            return <ResultRack r={result.rack} />;
        default:
            return null;
    }
}

function ResultShell({ tone = "neutral", kicker, title, body, actions }) {
    const tones = {
        neutral: "bg-white border-[var(--qrc-line)]",
        accent: "bg-[var(--qrc-accent-bg)] border-[var(--qrc-accent-border)]",
        info: "bg-[var(--qrc-info-bg)] border-[var(--qrc-info-border)]",
        warn: "bg-[var(--qrc-warn-bg)] border-[var(--qrc-warn-border)]",
        danger: "bg-[var(--qrc-danger-bg)] border-[var(--qrc-danger-border)]",
    };
    return (
        <div className={`qrc-fade-in rounded-[10px] border p-4 ${tones[tone]}`}>
            <div className="mb-2 min-w-0">
                <Eyebrow className="mb-1">{kicker}</Eyebrow>
                <div className="text-[var(--qrc-ink)] font-semibold text-[15px]">{title}</div>
            </div>
            <div className="text-[13px] text-[var(--qrc-ink2)] leading-relaxed">{body}</div>
            {actions && <div className="flex items-center gap-2 mt-4 flex-wrap">{actions}</div>}
        </div>
    );
}

// Two real backend calls: raise a reprint request, then immediately print it — used by every
// resolver "reprint an already-active code" action. The resolve endpoint doesn't expose the
// underlying stockItemQr id, only stockItemId, so the print-check duplicate guard (which needs
// stockItemQrIds) cannot be wired for this specific path — documented in the build report.
function useQuickReprint() {
    const { data: referenceResponse } = useQrCenterReferenceApi();
    const createReprint = useCreateQrCenterReprintApi();
    const bulkPrint = useBulkPrintReprintsApi();
    const printers = referenceResponse?.data?.printers ?? [];
    const defaultPrinter = printers.find((p) => p.isActive) ?? printers[0];

    const run = async ({ stockItemId, reasonCode = "REBAG", successMessage }) => {
        if (!defaultPrinter) {
            toast.error("No printer is configured yet — add one before printing.");
            return;
        }
        try {
            const created = await createReprint.mutateAsync({
                stockItemId,
                reasonCode,
                raisedBy: "zelero.tech@gmail.com",
            });
            const reprintRequestId = created?.data?.id;
            await bulkPrint.mutateAsync({ reprintRequestIds: [reprintRequestId], printerId: defaultPrinter.id });
            toast.success(successMessage ?? "Reprint job queued.");
        } catch (err) {
            toast.error(err?.message ?? "Couldn't queue the reprint job.");
        }
    };

    return { run, pending: createReprint.isPending || bulkPrint.isPending, hasPrinter: !!defaultPrinter };
}

function ResultSet({ r }) {
    const quickReprint = useQuickReprint();
    const breakSet = useBreakSetApi();
    const [breakReason, setBreakReason] = useState(BREAK_SET_REASONS[0]);

    const handleBreakSet = async () => {
        try {
            const res = await breakSet.mutateAsync({ stockItemId: r.stockItemId, reasonCode: breakReason });
            const successors = res?.data?.successors ?? [];
            toast.success(`Set broken — ${successors.length} piece tag${successors.length === 1 ? "" : "s"} created.`);
        } catch (err) {
            toast.error(err?.message ?? "Couldn't break the set.");
        }
    };

    return (
        <ResultShell
            tone="accent"
            kicker="Active set"
            title={
                <>
                    <span className="qrc-mono">{r.shortCode}</span> <span className="text-[var(--qrc-ink3)] font-normal">— sealed set</span>
                </>
            }
            body={
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--qrc-ink)]">
                        <VariantDot color={r.variant?.colorHex} /> {r.design?.code} · {r.variant?.colorName}
                    </span>
                    <span className="qrc-mono text-[var(--qrc-ink3)]">
                        {r.pieceCount} pc {r.sizeLabels?.length ? `(${r.sizeLabels.join(" · ")})` : ""}
                    </span>
                    {r.rack && (
                        <span className="text-[var(--qrc-ink3)]">
                            Rack <b className="qrc-mono text-[var(--qrc-ink)]">{r.rack.code}</b>
                        </span>
                    )}
                    <span className="text-[var(--qrc-ink3)]">
                        Sealed <b className="qrc-mono text-[var(--qrc-ink)]">{r.sealedDays}d</b>
                    </span>
                    <span className="text-[var(--qrc-ink3)]">
                        MRP <b className="qrc-mono text-[var(--qrc-ink)]">{fmtINR(r.mrp)}</b>
                    </span>
                </div>
            }
            actions={
                <>
                    <PrimaryButton disabled={quickReprint.pending} onClick={() => quickReprint.run({ stockItemId: r.stockItemId, successMessage: `Reprint queued for ${r.shortCode}.` })}>
                        Reprint
                    </PrimaryButton>
                    <NativeSelect className="w-auto" value={breakReason} onChange={(e) => setBreakReason(e.target.value)}>
                        {BREAK_SET_REASONS.map((code) => (
                            <option key={code} value={code}>
                                {code}
                            </option>
                        ))}
                    </NativeSelect>
                    <SecondaryButton disabled={breakSet.isPending} onClick={handleBreakSet}>
                        Break set
                    </SecondaryButton>
                </>
            }
        />
    );
}

function ResultPiece({ r, onChip }) {
    const quickReprint = useQuickReprint();
    return (
        <ResultShell
            tone="accent"
            kicker="Active piece"
            title={
                <>
                    <span className="qrc-mono">{r.shortCode}</span> <span className="text-[var(--qrc-ink3)] font-normal">— loose piece</span>
                </>
            }
            body={
                <>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-[var(--qrc-ink)]">
                            <VariantDot color={r.variant?.colorHex} /> {r.design?.code} · {r.variant?.colorName}
                        </span>
                        <span className="text-[var(--qrc-ink3)]">
                            Size <b className="qrc-mono text-[var(--qrc-ink)]">{r.sizeLabel}</b>
                        </span>
                        <span className="text-[var(--qrc-ink3)]">
                            Loose <b className="qrc-mono text-[var(--qrc-ink)]">{r.looseDays}d</b>
                        </span>
                        {r.bin && (
                            <span className="text-[var(--qrc-ink3)]">
                                Bin <b className="qrc-mono text-[var(--qrc-ink)]">{r.bin.code}</b>
                            </span>
                        )}
                    </div>
                    {r.parent && (
                        <div className="mt-2 text-[var(--qrc-ink3)]">
                            Origin: <b className="text-[var(--qrc-ink)]">{r.origin === "SET_BREAK" ? "set break" : "loose received"}{r.originReason ? ` — ${r.originReason}` : ""}</b> · parent{" "}
                            <button type="button" onClick={() => onChip(r.parent.shortCode)} className="qrc-mono text-[var(--qrc-accent-hover)] font-semibold hover:underline">
                                {r.parent.shortCode}
                            </button>
                        </div>
                    )}
                </>
            }
            actions={
                <PrimaryButton disabled={quickReprint.pending} onClick={() => quickReprint.run({ stockItemId: r.stockItemId, successMessage: `Reprint queued for ${r.shortCode}.` })}>
                    Reprint tag
                </PrimaryButton>
            }
        />
    );
}

function ResultRetired({ r, onChip }) {
    const quickReprint = useQuickReprint();
    const successors = r.successors ?? [];

    const printAllSuccessors = async () => {
        for (const s of successors) {
            // eslint-disable-next-line no-await-in-loop
            await quickReprint.run({ stockItemId: s.stockItemId, successMessage: undefined });
        }
        toast.success(`Reprint queued for ${successors.length} successor${successors.length === 1 ? "" : "s"}.`);
    };

    return (
        <ResultShell
            tone="info"
            kicker="Retired code"
            title={
                <>
                    <span className="qrc-mono">{r.shortCode}</span> <span className="text-[var(--qrc-ink3)] font-normal">— superseded</span>
                </>
            }
            body={
                <>
                    <p>
                        Retired <b className="text-[var(--qrc-ink)] qrc-mono">{r.retiredAt ? new Date(r.retiredAt).toLocaleDateString("en-IN") : "—"}</b> — this set was broken for{" "}
                        <b className="text-[var(--qrc-ink)]">{r.retiredReason ?? "an unspecified reason"}</b>.
                    </p>
                    {successors.length > 0 && (
                        <div className="mt-2.5">
                            <div className="text-[11px] font-semibold text-[var(--qrc-info)] uppercase tracking-wide mb-1.5">Successor pieces</div>
                            <div className="flex flex-wrap gap-2">
                                {successors.map((s) => (
                                    <button
                                        key={s.shortCode}
                                        type="button"
                                        onClick={() => onChip(s.shortCode)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-[var(--qrc-info-border)] hover:border-[var(--qrc-info)] text-[12px] font-semibold text-[var(--qrc-ink)] transition-colors"
                                    >
                                        <span className="qrc-mono">{s.shortCode}</span>
                                        <span className="text-[var(--qrc-ink3)] font-normal">Size {s.sizeLabel}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            }
            actions={
                successors.length > 0 && (
                    <PrimaryButton disabled={quickReprint.pending} onClick={printAllSuccessors}>
                        Print their tags
                    </PrimaryButton>
                )
            }
        />
    );
}

function ResultUnknown({ r, onGotoTab }) {
    return (
        <ResultShell
            tone="warn"
            kicker="Unknown code"
            title={
                <>
                    <span className="qrc-mono">{r.code}</span> <span className="text-[var(--qrc-ink3)] font-normal">— not issued by this system</span>
                </>
            }
            body={<p>This code doesn't match any set, piece, rack or bin ever generated here. It may belong to another system, or be miswritten.</p>}
            actions={<PrimaryButton onClick={() => onGotoTab("recovery")}>Start Recovery</PrimaryButton>}
        />
    );
}

function ResultRack({ r }) {
    return (
        <ResultShell
            tone="neutral"
            kicker="Rack summary"
            title={
                <>
                    Rack <span className="qrc-mono">{r.code}</span>
                </>
            }
            body={
                <>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-2.5">
                        <span className="text-[var(--qrc-ink3)]">
                            Expected <b className="qrc-mono text-[var(--qrc-ink)]">{r.expectedSets}</b> sets
                        </span>
                        <span className="text-[var(--qrc-ink3)]">
                            Scanned <b className="qrc-mono text-[var(--qrc-ink)]">{r.scannedSets}</b>
                        </span>
                        <span className="text-[var(--qrc-ink3)]">
                            Missing <b className="qrc-mono text-[var(--qrc-danger)]">{r.missing}</b>
                        </span>
                    </div>
                    <div className="space-y-1">
                        {(r.breakdown ?? []).map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-[var(--qrc-ink2)]">
                                <VariantDot color={b.colorHex} />
                                <span className="font-medium text-[var(--qrc-ink)]">
                                    {b.designCode} · {b.colorName}
                                </span>
                                <span className="qrc-mono text-[var(--qrc-ink3)] ml-auto">{b.sets} sets</span>
                            </div>
                        ))}
                    </div>
                </>
            }
        />
    );
}

function ResultDuplicate({ r }) {
    return (
        <ResultShell
            tone="danger"
            kicker="Duplicate conflict"
            title={
                <>
                    Code <span className="qrc-mono">{r.shortCode}</span> is claimed by {r.events?.length ?? 0} physical objects
                </>
            }
            body={
                <>
                    <p className="mb-2">Two separate print jobs generated the same code. Do not scan either object into stock until this is reconciled.</p>
                    <div className="space-y-1.5">
                        {(r.events ?? []).map((e, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-[var(--qrc-danger-border)] rounded-lg px-3 py-2 flex-wrap">
                                <span className="w-5 h-5 rounded-full bg-[var(--qrc-danger-bg)] border border-[var(--qrc-danger-border)] text-[var(--qrc-danger)] text-[10px] font-bold flex items-center justify-center flex-none">
                                    {i + 1}
                                </span>
                                <span className="qrc-mono font-semibold text-[var(--qrc-ink)]">Job #{e.printJobId}</span>
                                <span className="text-[var(--qrc-ink3)]">{e.printedAt ? new Date(e.printedAt).toLocaleString("en-IN") : "—"}</span>
                                <span className="text-[var(--qrc-ink3)]">
                                    by <b className="text-[var(--qrc-ink)]">{e.createdBy}</b>
                                </span>
                                {e.printerName && <span className="text-[var(--qrc-ink3)] ml-auto">{e.printerName}</span>}
                            </div>
                        ))}
                    </div>
                </>
            }
        />
    );
}

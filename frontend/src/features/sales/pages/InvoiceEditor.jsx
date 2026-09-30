import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/shared/ActionModal";
import { checkInvoiceNumberApi, checkScanApi, suggestInvoiceNumberApi } from "../services/invoice.api.js";
import { getOrderFormApi, getOrderFormByNumberApi } from "../services/orderForm.api.js";
import { useInvoiceApi, useSaveInvoiceApi } from "../hooks/useInvoicesApi.js";
import DocumentNumberField from "../components/DocumentNumberField.jsx";
import PartyPicker, { EMPTY_PARTY_FIELDS } from "../components/PartyPicker.jsx";
import PartySyncDialog from "../components/PartySyncDialog.jsx";
import ScanPanel from "../components/ScanPanel.jsx";
import { inr, todayIso } from "../utils/format.js";

const KIND_LABEL = { SET: "SET", BUNDLE: "BUNDLE", PIECE: "PIECE", LOOSE_PIECE: "LOOSE" };

const InvoiceEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEditing = Boolean(id);

    const { data: existingResponse, isPending: loadingExisting } = useInvoiceApi(id);
    const existing = existingResponse?.data;

    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(todayIso());
    const [orderForm, setOrderForm] = useState(null);
    const [orderFormQuery, setOrderFormQuery] = useState("");
    const [orderFormError, setOrderFormError] = useState("");
    const [party, setParty] = useState(EMPTY_PARTY_FIELDS);
    const [linkedParty, setLinkedParty] = useState(null);
    const [picked, setPicked] = useState([]);
    const [ticks, setTicks] = useState({});
    const [feedback, setFeedback] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [syncPrompt, setSyncPrompt] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const saveInvoice = useSaveInvoiceApi();

    // Arriving from an order form's "Create Invoice" button.
    useEffect(() => {
        const orderFormId = searchParams.get("orderFormId");
        if (!orderFormId || isEditing) return;

        getOrderFormApi(orderFormId)
            .then((response) => loadOrderForm(response.data))
            .catch((error) => setOrderFormError(error.message));
    }, [searchParams, isEditing]);

    useEffect(() => {
        if (!existing) return;

        setInvoiceNumber(existing.invoiceNumber);
        setInvoiceDate(existing.invoiceDate);
        setParty(existing.party);
        setLinkedParty(existing.partyId ? { id: existing.partyId, ...existing.party } : null);
        setTicks(existing.ticks ?? {});
        setPicked(existing.lines.flatMap((line) => line.tags.map((tag) => ({
            scanCode: tag.scanCode,
            kind: tag.kind,
            pieces: tag.pieces,
            method: tag.method,
            designCode: line.designCode,
            designName: line.designName,
            colorName: line.colorName,
            colorHex: line.colorHex,
            colorVariantId: line.colorVariantId,
            unitPrice: line.unitPrice,
            sizeBreakdown: tag.sizeBreakdown,
        }))));

        getOrderFormApi(existing.orderFormId).then((response) => setOrderForm(response.data)).catch(() => {});
    }, [existing]);

    function loadOrderForm(form) {
        setOrderForm(form);
        setOrderFormQuery(form.formNumber);
        setOrderFormError("");
        setParty(form.party);
        setLinkedParty(form.partyId ? { id: form.partyId, ...form.party } : null);
    }

    const fetchOrderForm = async () => {
        if (!orderFormQuery.trim()) return setOrderFormError("Enter an order form number first.");

        try {
            const response = await getOrderFormByNumberApi(orderFormQuery.trim());

            if (response.data.status === "INVOICED") {
                setOrderFormError(`${response.data.formNumber} is already invoiced as ${response.data.invoice?.invoiceNumber ?? "another invoice"}.`);
                return;
            }

            loadOrderForm(response.data);
        } catch (error) {
            setOrderFormError(error.message);
        }
    };

    const handleScan = async (code, method) => {
        setScanning(true);

        try {
            const response = await checkScanApi({
                code,
                scanned: picked.map((item) => item.scanCode),
                invoiceId: existing?.id,
            });
            const result = response.data;

            if (result.state === "UNKNOWN") {
                setFeedback({ tone: "bad", message: `${code} isn't a known QR tag.` });
                return;
            }
            if (result.state === "RETIRED") {
                setFeedback({ tone: "bad", message: `${code} is a retired label — its stock was broken up or relabelled. Scan the current tag.` });
                return;
            }
            if (result.state === "DUPLICATE") {
                setFeedback({ tone: "bad", message: `${code} is printed on two different items. Fix it in QR Center before billing either.` });
                return;
            }
            if (result.state === "ALREADY_SCANNED") {
                setFeedback({ tone: "warn", message: `${code} is already on this invoice.` });
                return;
            }
            if (result.state === "UNAVAILABLE") {
                setFeedback({
                    tone: "bad",
                    message: result.billedOn
                        ? `${code} was already sold on ${result.billedOn}.`
                        : `${code} is no longer in the sellable pool.`,
                });
                return;
            }

            setPicked((previous) => [...previous, {
                scanCode: result.shortCode,
                kind: result.kind,
                pieces: result.pieces,
                method,
                designCode: result.designCode,
                designName: result.designName,
                colorName: result.colorName,
                colorHex: result.colorHex,
                colorVariantId: result.colorVariantId,
                unitPrice: result.unitPrice,
                sizeBreakdown: result.sizeBreakdown,
            }]);

            const onOrderForm = orderForm?.items.some((item) => item.colorVariantId === result.colorVariantId);
            const sizes = result.sizeBreakdown.map((size) => size.sizeLabel).join(" · ");

            setFeedback({
                tone: onOrderForm ? "ok" : "warn",
                message: `+${result.pieces} pcs · ${KIND_LABEL[result.kind]} ${result.shortCode} (${sizes}) added to ${result.designCode} ${result.colorName}${
                    onOrderForm ? "." : " — not on the order form, added as an extra."
                }`,
            });
        } catch (error) {
            setFeedback({ tone: "bad", message: error.message });
        } finally {
            setScanning(false);
        }
    };

    const lines = useMemo(() => {
        const byVariant = new Map();

        for (const item of picked) {
            const existingLine = byVariant.get(item.colorVariantId) ?? {
                colorVariantId: item.colorVariantId,
                designCode: item.designCode,
                designName: item.designName,
                colorName: item.colorName,
                colorHex: item.colorHex,
                unitPrice: item.unitPrice,
                pieces: 0,
                tags: [],
            };

            existingLine.pieces += item.pieces;
            existingLine.tags.push(item);
            byVariant.set(item.colorVariantId, existingLine);
        }

        return [...byVariant.values()].map((line) => ({
            ...line,
            amount: line.pieces * line.unitPrice,
            isExtra: orderForm ? !orderForm.items.some((item) => item.colorVariantId === line.colorVariantId) : false,
        }));
    }, [picked, orderForm]);

    const totals = useMemo(() => ({
        pieces: lines.reduce((sum, line) => sum + line.pieces, 0),
        amount: lines.reduce((sum, line) => sum + line.amount, 0),
    }), [lines]);

    const pickedFor = (colorVariantId) =>
        picked.filter((item) => item.colorVariantId === colorVariantId).reduce((sum, item) => sum + item.pieces, 0);

    const save = async (partySync) => {
        try {
            const result = await saveInvoice.mutateAsync({
                id: existing?.id,
                payload: {
                    invoiceNumber: invoiceNumber.trim(),
                    invoiceDate,
                    orderFormId: orderForm.id,
                    partyId: linkedParty?.id ?? null,
                    party,
                    partySync,
                    ticks,
                    scans: picked.map((item) => ({ scanCode: item.scanCode, method: item.method })),
                },
            });

            toast.success(result.message);
            navigate(`/stock-out/invoices/${result.data.id}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const submit = () => {
        if (!invoiceNumber.trim()) return toast.error("Enter the invoice number.");
        if (!orderForm) return toast.error("Fetch an order form first.");
        if (picked.length === 0) return toast.error("Scan at least one set or piece.");

        const short = orderForm.items.filter((item) => pickedFor(item.colorVariantId) < item.quantityPcs);
        const unticked = orderForm.items.filter((item) => !ticks[item.colorVariantId]);
        const extras = lines.filter((line) => line.isExtra);

        setConfirm({ short, unticked, extras });
    };

    const confirmed = () => {
        setConfirm(null);

        const changed = linkedParty
            ? ["name", "mobile", "city", "gst", "transport", "agent"].filter((field) => (linkedParty[field] ?? "") !== (party[field] ?? ""))
            : [];

        if (changed.length > 0) {
            setSyncPrompt({ changed, linkedParty, party });
            return;
        }

        save("document");
    };

    if (isEditing && loadingExisting) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#00694C]" /></div>;
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto pb-4">
            <div className="glass-card rounded-[24px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/stock-out/invoices")}
                            className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#1E1B4B]/60 hover:text-[#1E1B4B]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Invoices
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">
                            {isEditing ? "Edit Invoice" : "New Invoice"}
                        </h1>
                        <p className="mt-1 max-w-[70ch] text-sm text-[#1E1B4B]/60">
                            Fetch the order form as your checklist, then scan every set or piece you pick.
                            Stock is deducted only when you generate the invoice.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-4">
                        <DocumentNumberField
                            label="Invoice no."
                            value={invoiceNumber}
                            onChange={setInvoiceNumber}
                            placeholder="e.g. INV-2026-042"
                            check={checkInvoiceNumberApi}
                            suggest={suggestInvoiceNumberApi}
                            excludeId={existing?.id}
                        />
                        <div className="w-40">
                            <label className="mb-1.5 block text-xs font-semibold text-[#1E1B4B]" htmlFor="invoice-date">Date</label>
                            <input
                                id="invoice-date"
                                type="date"
                                className="pill-input font-mono"
                                value={invoiceDate}
                                onChange={(event) => setInvoiceDate(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 max-w-xl">
                    <label className="mb-1.5 block text-xs font-semibold text-[#1E1B4B]" htmlFor="order-form-number">
                        Order form no. <span className="text-red-600">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="order-form-number"
                            className="pill-input font-mono"
                            value={orderFormQuery}
                            disabled={isEditing}
                            onChange={(event) => setOrderFormQuery(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); fetchOrderForm(); } }}
                            placeholder="Type the order form number to fetch it"
                        />
                        <button
                            type="button"
                            onClick={fetchOrderForm}
                            disabled={isEditing}
                            className="shrink-0 rounded-lg bg-[#1E1B4B] px-4 text-xs font-semibold text-white disabled:opacity-50"
                        >
                            Fetch
                        </button>
                    </div>
                    <p className={`mt-1.5 min-h-[18px] text-[11.5px] ${orderFormError ? "text-red-600" : "text-emerald-700"}`}>
                        {orderFormError || (orderForm ? `Fetched ${orderForm.formNumber} · ${orderForm.party.name} · ${orderForm.totalPcs} pcs requested` : "")}
                    </p>
                </div>
            </div>

            {!orderForm ? (
                <div className="glass-card flex flex-col items-center justify-center gap-2 rounded-[24px] p-10 text-center">
                    <b className="text-[#1E1B4B]">Fetch an order form to begin</b>
                    <span className="max-w-[52ch] text-sm text-[#1E1B4B]/55">
                        The order form becomes your picking checklist — you can still scan designs that aren't on it.
                    </span>
                </div>
            ) : (
                <>
                    <div className="glass-card rounded-[24px] p-5">
                        <PartyPicker value={party} onChange={setParty} linkedParty={linkedParty} onLink={setLinkedParty} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="glass-card rounded-[24px] p-5">
                            <div className="mb-3">
                                <h2 className="text-base font-bold text-[#1E1B4B]">Checklist · {orderForm.formNumber}</h2>
                                <p className="text-xs text-[#1E1B4B]/60">
                                    Tick each line as you find it in the godown. Demand vs picked updates as you scan.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                {orderForm.items.map((item) => {
                                    const got = pickedFor(item.colorVariantId);
                                    const ticked = Boolean(ticks[item.colorVariantId]);

                                    return (
                                        <div
                                            key={item.colorVariantId}
                                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                                                ticked ? "border-emerald-200 bg-emerald-50/70" : "border-white/60 bg-white/60"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setTicks((previous) => ({ ...previous, [item.colorVariantId]: !previous[item.colorVariantId] }))}
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                                    ticked ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#1E1B4B]/20 bg-white"
                                                }`}
                                                aria-label={`Tick ${item.designCode} ${item.colorName}`}
                                            >
                                                {ticked && <Check className="h-3 w-3" />}
                                            </button>

                                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.colorHex }} />

                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-semibold text-[#1E1B4B]">
                                                    {item.designCode} {item.colorName}
                                                </div>
                                            </div>

                                            <span className="w-14 text-right font-mono text-xs text-[#1E1B4B]/60" title="Requested">{item.quantityPcs}</span>
                                            <span className="w-14 text-right font-mono text-xs text-[#1E1B4B]/45" title="Available">{item.availablePcs ?? 0}</span>
                                            <span className={`w-12 text-right font-mono text-sm font-bold ${got ? "text-[#1E1B4B]" : "text-[#1E1B4B]/30"}`} title="Picked">{got}</span>

                                            <span className="w-28 text-right">
                                                {got >= item.quantityPcs ? (
                                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                                                        {got > item.quantityPcs ? `+${got - item.quantityPcs} extra` : "Complete"}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                                                        {item.quantityPcs - got} more
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="glass-card rounded-[24px] p-5">
                            <ScanPanel
                                title="Scan picked stock"
                                hint="A set tag bills the whole set, a piece tag bills one piece. Counted automatically."
                                placeholder="Set ID or piece ID"
                                onScan={handleScan}
                                feedback={feedback}
                                busy={scanning}
                            />
                        </div>
                    </div>

                    <div className="glass-card rounded-[24px] p-5">
                        <div className="mb-3">
                            <h2 className="text-base font-bold text-[#1E1B4B]">Picked for this invoice</h2>
                            <p className="text-xs text-[#1E1B4B]/60">
                                Every scanned tag, grouped by design and colour. Remove one if it was scanned by mistake.
                            </p>
                        </div>

                        {lines.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#1E1B4B]/15 p-8 text-center">
                                <b className="block text-sm text-[#1E1B4B]">Nothing picked yet</b>
                                <span className="text-sm text-[#1E1B4B]/55">Scan the first set or piece you pick from the godown.</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {lines.map((line) => (
                                    <div key={line.colorVariantId} className="overflow-hidden rounded-2xl border border-white/60">
                                        <div className="flex items-center justify-between gap-3 bg-white/70 px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: line.colorHex }} />
                                                <b className="text-sm text-[#1E1B4B]">{line.designCode} · {line.colorName}</b>
                                                {line.isExtra && (
                                                    <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                                                        NOT ON ORDER FORM
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono text-sm font-bold text-[#1E1B4B]">{line.pieces} pcs · {inr(line.amount)}</span>
                                        </div>

                                        {line.tags.map((tag) => (
                                            <div key={tag.scanCode} className="flex items-center gap-3 border-t border-white/60 bg-white/40 px-4 py-2 text-xs">
                                                <span className="font-mono font-semibold text-[#1E1B4B]">{tag.scanCode}</span>
                                                <span className="rounded bg-[#1E1B4B]/8 px-1.5 py-0.5 text-[10px] font-bold text-[#1E1B4B]/70">
                                                    {KIND_LABEL[tag.kind]}
                                                </span>
                                                <span className="font-mono text-[11px] text-[#1E1B4B]/50">
                                                    {tag.sizeBreakdown.map((size) => size.sizeLabel).join(" ")}
                                                </span>
                                                <span className="ml-auto font-mono text-[#1E1B4B]/70">{tag.pieces} pcs</span>
                                                <span className="text-[11px] text-[#1E1B4B]/40">{tag.method}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPicked((previous) => previous.filter((item) => item.scanCode !== tag.scanCode));
                                                        setFeedback({ tone: "warn", message: `Removed ${tag.scanCode} from this invoice.` });
                                                    }}
                                                    className="rounded p-1 text-[#1E1B4B]/35 hover:bg-red-50 hover:text-red-600"
                                                    title="Remove"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-5">
                        <div className="flex flex-wrap gap-6">
                            {[
                                { label: "Variants", value: lines.length },
                                { label: "Tags scanned", value: picked.length },
                                { label: "Pieces", value: totals.pieces },
                                { label: "Invoice value", value: inr(totals.amount), accent: true },
                            ].map((stat) => (
                                <div key={stat.label}>
                                    <div className={`font-mono text-lg font-bold ${stat.accent ? "text-[#00694C]" : "text-[#1E1B4B]"}`}>{stat.value}</div>
                                    <div className="text-[10.5px] uppercase tracking-wide text-[#1E1B4B]/45">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => navigate("/stock-out/invoices")}>Cancel</Button>
                            <Button
                                className="rounded-full bg-[#00694C] px-6 text-white hover:bg-[#00563e]"
                                onClick={submit}
                                disabled={saveInvoice.isPending}
                            >
                                <Check className="mr-1.5 h-4 w-4" />
                                {isEditing ? "Save invoice changes" : "Generate Invoice"}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {confirm && (
                <ActionModal
                    openActionModal
                    setOpenActionModal={() => setConfirm(null)}
                    title={isEditing ? `Save changes to ${invoiceNumber}?` : `Generate invoice ${invoiceNumber}?`}
                    subtitle={`${totals.pieces} pieces across ${lines.length} variant${lines.length === 1 ? "" : "s"} · ${inr(totals.amount)} for ${party.name}`}
                    showCloseButton
                >
                    <div className="px-6 py-4 text-sm text-[#1E1B4B]/75">
                        <p>{isEditing ? "Stock will be adjusted to match the updated invoice." : "These pieces will be deducted from stock."}</p>

                        {(confirm.short.length > 0 || confirm.unticked.length > 0 || confirm.extras.length > 0) && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">
                                {confirm.short.length > 0 && (
                                    <li><b>{confirm.short.length}</b> order line{confirm.short.length === 1 ? " is" : "s are"} not fully picked.</li>
                                )}
                                {confirm.unticked.length > 0 && (
                                    <li><b>{confirm.unticked.length}</b> checklist line{confirm.unticked.length === 1 ? " isn't" : "s aren't"} ticked.</li>
                                )}
                                {confirm.extras.length > 0 && (
                                    <li><b>{confirm.extras.length}</b> variant{confirm.extras.length === 1 ? "" : "s"} not on the order form will be billed as extras.</li>
                                )}
                            </ul>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-white/40 px-6 py-4">
                        <Button variant="ghost" onClick={() => setConfirm(null)}>Back to picking</Button>
                        <Button className="rounded-full bg-[#00694C] px-5 text-white hover:bg-[#00563e]" onClick={confirmed}>
                            {isEditing ? "Save changes" : "Generate Invoice"}
                        </Button>
                    </div>
                </ActionModal>
            )}

            {syncPrompt && (
                <PartySyncDialog
                    changed={syncPrompt.changed}
                    linkedParty={syncPrompt.linkedParty}
                    party={syncPrompt.party}
                    onClose={() => setSyncPrompt(null)}
                    onChoose={(choice) => { setSyncPrompt(null); save(choice); }}
                />
            )}
        </div>
    );
};

export default InvoiceEditor;

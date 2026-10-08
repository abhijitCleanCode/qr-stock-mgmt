import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOrderFormNumberApi, suggestOrderFormNumberApi } from "../services/orderForm.api.js";
import { resolveDesignApi } from "../services/sales.api.js";
import { useOrderFormApi, useOrderFormsApi, useSaveOrderFormApi } from "../hooks/useOrderFormsApi.js";
import DocumentNumberField from "../components/DocumentNumberField.jsx";
import PartyPicker, { EMPTY_PARTY_FIELDS } from "../components/PartyPicker.jsx";
import PartySyncDialog from "../components/PartySyncDialog.jsx";
import ScanPanel from "../components/ScanPanel.jsx";
import { todayIso } from "../utils/format.js";

const OrderFormEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const { data: existingResponse, isPending: loadingExisting } = useOrderFormApi(id);
    const existing = existingResponse?.data;

    const [formNumber, setFormNumber] = useState("");
    const [formDate, setFormDate] = useState(todayIso());
    const [salesman, setSalesman] = useState("");
    const [notes, setNotes] = useState("");
    const [party, setParty] = useState(EMPTY_PARTY_FIELDS);
    const [linkedParty, setLinkedParty] = useState(null);
    const [items, setItems] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [syncPrompt, setSyncPrompt] = useState(null);

    const saveOrderForm = useSaveOrderFormApi();

    // Names already used on earlier order forms, offered as suggestions so the same person is not
    // typed three different ways.
    const { data: recentForms } = useOrderFormsApi({ limit: 200 });
    const salesmanNames = useMemo(
        () => [...new Set((recentForms?.data ?? []).map((form) => form.salesman).filter(Boolean))].sort(),
        [recentForms],
    );

    useEffect(() => {
        if (!existing) return;

        setFormNumber(existing.formNumber);
        setFormDate(existing.formDate);
        setSalesman(existing.salesman ?? "");
        setNotes(existing.notes ?? "");
        setParty(existing.party);
        setLinkedParty(existing.partyId ? { id: existing.partyId, ...existing.party } : null);
        setItems(existing.items.map((item) => ({
            colorVariantId: item.colorVariantId,
            designId: item.designId,
            designCode: item.designCode,
            designName: item.designName,
            colorName: item.colorName,
            colorHex: item.colorHex,
            quantityPcs: item.quantityPcs,
            availablePcs: item.availablePcs,
        })));
    }, [existing]);

    const totals = useMemo(() => ({
        designs: new Set(items.map((item) => item.designId)).size,
        variants: items.length,
        pieces: items.reduce((sum, item) => sum + item.quantityPcs, 0),
    }), [items]);

    const handleScan = async (code) => {
        setScanning(true);

        try {
            const response = await resolveDesignApi(code);
            const data = response.data;

            if (!data || data.state !== "OK") {
                setFeedback({
                    tone: "bad",
                    message: data?.state === "DUPLICATE"
                        ? `${data.shortCode} is on two different items — fix it in QR Center before using it here.`
                        : data?.state === "RETIRED"
                        ? `${data.shortCode} is a retired label — scan the item's current tag.`
                        : "That isn't a known tag or design code. Check the ID and try again.",
                });
                return;
            }

            // The scanned tag's own colour goes straight onto the order with the tag's piece count
            // (a set tag = its pieces, a piece tag = 1); scanning another tag of the same colour adds
            // to that line. Quantities stay editable in the list below.
            const variant = data.design.variants.find((item) => item.colorVariantId === data.colorVariantId);
            setItems((previous) => {
                const existingLine = previous.find((item) => item.colorVariantId === data.colorVariantId);
                if (existingLine) {
                    return previous.map((item) => item.colorVariantId === data.colorVariantId
                        ? { ...item, quantityPcs: item.quantityPcs + data.pieces }
                        : item);
                }

                return [...previous, {
                    colorVariantId: data.colorVariantId,
                    designId: data.designId,
                    designCode: data.designCode,
                    designName: data.designName,
                    colorName: data.colorName,
                    colorHex: data.colorHex,
                    quantityPcs: data.pieces,
                    availablePcs: variant?.availablePcs ?? 0,
                }];
            });

            setFeedback({
                tone: "ok",
                message: `Added ${data.pieces} pcs of ${data.designCode} ${data.colorName} (${data.shortCode}). Scan the next tag, or change the quantity below.`,
            });
        } catch (error) {
            setFeedback({ tone: "bad", message: error.message });
        } finally {
            setScanning(false);
        }
    };

    const save = async (partySync) => {
        try {
            const result = await saveOrderForm.mutateAsync({
                id: existing?.id,
                payload: {
                    formNumber: formNumber.trim(),
                    formDate,
                    partyId: linkedParty?.id ?? null,
                    party,
                    partySync,
                    salesman: salesman.replace(/\s+/g, " ").trim(),
                    notes,
                    items: items.map((item) => ({ colorVariantId: item.colorVariantId, quantityPcs: item.quantityPcs })),
                },
            });

            toast.success(`Order form ${result.data.formNumber} saved.`);
            navigate(`/stock-out/orders/${result.data.id}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const submit = () => {
        if (!formNumber.trim()) return toast.error("Enter the order form number.");
        if (!party.name.trim()) return toast.error("Enter the party name.");
        if (items.length === 0) return toast.error("Scan at least one design.");

        // If the typed party details differ from the saved record, the user decides whether Party
        // Master should learn the change — the same question the prototype asks.
        const changed = linkedParty
            ? ["name", "mobile", "city", "gst", "transport", "agent"]
                .filter((field) => (linkedParty[field] ?? "") !== (party[field] ?? ""))
            : [];

        if (changed.length > 0) {
            setSyncPrompt({ changed, linkedParty, party });
            return;
        }

        save("document");
    };

    if (isEditing && loadingExisting) {
        return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-[#00694C]" /></div>;
    }

    return (
        <div className="flex flex-col gap-4 pb-4">
            <div className="glass-card rounded-[24px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/stock-out/orders")}
                            className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#1E1B4B]/60 hover:text-[#1E1B4B]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Order Forms
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">
                            {isEditing ? "Edit Order Form" : "New Order Form"}
                        </h1>
                        <p className="mt-1 max-w-[70ch] text-sm text-[#1E1B4B]/60">
                            A checklist of what the customer wants. Quantities may exceed what is in stock — nothing is deducted here.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-4">
                        <DocumentNumberField
                            label="Order form no."
                            value={formNumber}
                            onChange={setFormNumber}
                            placeholder="e.g. OF-1024"
                            check={checkOrderFormNumberApi}
                            suggest={suggestOrderFormNumberApi}
                            excludeId={existing?.id}
                        />
                        <div className="w-40">
                            <label className="mb-1.5 block text-xs font-semibold text-[#1E1B4B]" htmlFor="form-date">Date</label>
                            <input
                                id="form-date"
                                type="date"
                                className="pill-input font-mono"
                                value={formDate}
                                onChange={(event) => setFormDate(event.target.value)}
                            />
                        </div>
                        <div className="w-56">
                            <label className="mb-1.5 block text-xs font-semibold text-[#1E1B4B]" htmlFor="order-salesman">Salesman</label>
                            <input
                                id="order-salesman"
                                className="pill-input"
                                list="order-salesman-names"
                                autoComplete="off"
                                maxLength={60}
                                value={salesman}
                                onChange={(event) => setSalesman(event.target.value)}
                                placeholder="Who took this order"
                            />
                            <datalist id="order-salesman-names">
                                {salesmanNames.map((name) => <option key={name} value={name} />)}
                            </datalist>
                            <p className="mt-1.5 text-[11.5px] text-[#1E1B4B]/50">Shown on the order form and the invoice.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[24px] p-5">
                <PartyPicker value={party} onChange={setParty} linkedParty={linkedParty} onLink={setLinkedParty} />
            </div>

            <div className="glass-card rounded-[24px] p-5">
                <ScanPanel
                    title="Add designs"
                    hint="Scan any hanging tag — set, semi-set or loose piece — and its pieces are added to the order. Adjust quantities below."
                    placeholder="Set ID or piece ID, e.g. FL20500"
                    onScan={handleScan}
                    feedback={feedback}
                    busy={scanning}
                />
            </div>

            <div className="glass-card rounded-[24px] p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-[#1E1B4B]">Requested items</h2>
                        <p className="text-xs text-[#1E1B4B]/60">
                            Availability is live from stock and never blocks the order.
                        </p>
                    </div>
                    <span className="text-xs text-[#1E1B4B]/60">
                        <b>{totals.designs}</b> designs · <b>{totals.variants}</b> variants · <b>{totals.pieces}</b> pcs
                    </span>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#1E1B4B]/15 p-8 text-center">
                        <b className="block text-sm text-[#1E1B4B]">No items yet</b>
                        <span className="text-sm text-[#1E1B4B]/55">Scan a hanging tag above to start.</span>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/50">
                        {items.map((item, index) => {
                            const short = item.quantityPcs - (item.availablePcs ?? 0);

                            return (
                                <div key={item.colorVariantId} className="flex flex-wrap items-center gap-4 border-b border-white/50 bg-white/60 px-4 py-3 last:border-b-0">
                                    <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: item.colorHex }} />
                                        <div>
                                            <div className="text-sm font-semibold text-[#1E1B4B]">
                                                {item.designCode} {item.colorName}
                                            </div>
                                            <div className="text-[11.5px] text-[#1E1B4B]/45">{item.designName}</div>
                                        </div>
                                    </div>

                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantityPcs}
                                        onChange={(event) => {
                                            const quantity = Number(event.target.value);
                                            setItems((previous) => previous.map((row, rowIndex) =>
                                                rowIndex === index ? { ...row, quantityPcs: quantity } : row));
                                        }}
                                        className="w-20 rounded-lg border border-[#1E1B4B]/15 bg-white px-2 py-1.5 text-right font-mono text-sm font-bold outline-none focus:border-emerald-500"
                                    />

                                    <span className="w-24 text-right font-mono text-xs text-[#1E1B4B]/60">
                                        {item.availablePcs ?? 0} in stock
                                    </span>

                                    <span className="w-28">
                                        {short <= 0 ? (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Available</span>
                                        ) : (item.availablePcs ?? 0) === 0 ? (
                                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Out of stock</span>
                                        ) : (
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Short by {short}</span>
                                        )}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setItems((previous) => previous.filter((_, rowIndex) => rowIndex !== index))}
                                        className="rounded-lg p-1.5 text-[#1E1B4B]/40 hover:bg-red-50 hover:text-red-600"
                                        title="Remove"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-[#1E1B4B]" htmlFor="order-notes">Notes</label>
                    <input
                        id="order-notes"
                        className="pill-input"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Optional, e.g. customer prefers pastel shades"
                    />
                </div>
            </div>

            <div className="glass-card flex flex-wrap justify-end gap-2 rounded-[24px] p-4">
                <Button variant="ghost" onClick={() => navigate("/stock-out/orders")}>Cancel</Button>
                <Button
                    className="rounded-full bg-[#00694C] px-6 text-white hover:bg-[#00563e]"
                    onClick={submit}
                    disabled={saveOrderForm.isPending}
                >
                    <Check className="mr-1.5 h-4 w-4" />
                    {isEditing ? "Save changes" : "Save Order Form"}
                </Button>
            </div>

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

export default OrderFormEditor;

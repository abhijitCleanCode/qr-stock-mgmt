import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";

import { useGalleryApi } from "../hooks/useSalesApi.js";
import GalleryFilters from "../components/gallery/GalleryFilters.jsx";
import { createMatcher, freshFilters } from "../utils/galleryFilters.js";
import { createOrderFormApi, getOrderFormApi, suggestOrderFormNumberApi, updateOrderFormApi } from "../services/orderForm.api.js";

// The customer's show: pick designs on a tablet, add quantities in whole sets, and the order form is
// kept up to date as you go. The order is created with its first quantity, because an order form
// needs at least one design to save.

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// Catalog colours grouped by design, in design-code order, for one screen per design.
const groupDesigns = (items) => {
  const byDesign = new Map();
  for (const item of items) {
    if (!byDesign.has(item.designId)) {
      byDesign.set(item.designId, {
        designId: item.designId,
        designCode: item.designCode,
        designName: item.designName,
        variants: [],
      });
    }
    byDesign.get(item.designId).variants.push({
      colorVariantId: item.colorVariantId,
      colorName: item.colorName,
      colorHex: item.colorHex,
      imageUrl: item.imageUrl,
      availablePcs: item.availablePcs,
      setPieces: item.setPieces ?? 0,
    });
  }
  return [...byDesign.values()].sort((a, b) => String(a.designCode).localeCompare(String(b.designCode), undefined, { numeric: true }));
};

const clock = (date) => date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// Order lines the server stores: only colours with pieces.
const linesFrom = (quantities) =>
  Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([colorVariantId, quantityPcs]) => ({ colorVariantId: Number(colorVariantId), quantityPcs }));

function StartForm({ onStart }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [salesman, setSalesman] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!name.trim()) return toast.error("Enter the customer's name.");
    setBusy(true);
    try {
      const suggested = await suggestOrderFormNumberApi();
      onStart({
        formNumber: suggested.data.formNumber ?? suggested.data.number,
        party: { name: name.trim(), mobile: mobile.trim() || null },
        salesman: salesman.trim(),
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-4 rounded-[24px] bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-[#1E1B4B]">Start a show</h1>
      <p className="text-sm text-slate-500">The order form is created with the first design the customer chooses.</p>
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
        Customer name
        <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-slate-300 px-3 font-normal" autoFocus />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
        Mobile (optional)
        <input value={mobile} onChange={(event) => setMobile(event.target.value)} className="h-11 rounded-xl border border-slate-300 px-3 font-normal" inputMode="tel" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
        Salesman (optional)
        <input value={salesman} onChange={(event) => setSalesman(event.target.value)} className="h-11 rounded-xl border border-slate-300 px-3 font-normal" />
      </label>
      <button type="button" onClick={start} disabled={busy} className="h-12 rounded-xl bg-[#00694C] font-semibold text-white disabled:opacity-50">
        {busy ? "Starting…" : "Start show"}
      </button>
    </div>
  );
}

export default function OrderShow() {
  const { id } = useParams();
  const navigate = useNavigate();

  const orderQuery = useQuery({
    queryKey: ["order-form", id],
    queryFn: () => getOrderFormApi(id),
    enabled: Boolean(id),
  });
  const [started, setStarted] = useState(null); // { formNumber, party, salesman } before the order exists
  const [filters, setFilters] = useState(freshFilters);
  const [index, setIndex] = useState(0);
  const [activeColour, setActiveColour] = useState(null);
  const [quantities, setQuantities] = useState(null); // colorVariantId -> pieces, null until the order loads
  const [save, setSave] = useState({ status: "idle", at: null });

  const order = orderQuery.data?.data ?? null;
  // The same catalog and filters as the Gallery: designs, item name, pattern, quality, price and stock.
  const catalog = useGalleryApi({ mode: "all" });
  const items = useMemo(() => catalog.data?.data?.items ?? [], [catalog.data]);
  const matches = useMemo(() => createMatcher(items, filters, "all"), [items, filters]);
  const visible = useMemo(() => items.filter((item) => matches(item)), [items, matches]);
  const designs = useMemo(() => groupDesigns(visible), [visible]);

  // Starting from a saved order: its quantities become the current state, once.
  if (order && quantities === null) {
    setQuantities(Object.fromEntries(order.items.map((item) => [item.colorVariantId, item.quantityPcs])));
  }

  // Everything known about each colour: the catalog, plus the saved order's own colours.
  const colourInfo = useMemo(() => {
    const info = new Map();
    for (const item of items) {
      info.set(item.colorVariantId, {
        designId: item.designId,
        designCode: item.designCode,
        designName: item.designName,
        colorName: item.colorName,
        colorHex: item.colorHex,
        imageUrl: item.imageUrl,
        availablePcs: item.availablePcs ?? 0,
        setPieces: item.setPieces ?? 0,
      });
    }
    for (const item of order?.items ?? []) {
      if (!info.has(item.colorVariantId)) {
        info.set(item.colorVariantId, {
          designId: item.designId,
          designCode: item.designCode,
          designName: item.designName,
          colorName: item.colorName,
          colorHex: item.colorHex,
          imageUrl: item.imageUrl,
          availablePcs: item.availablePcs ?? 0,
          setPieces: 0,
        });
      }
    }
    return info;
  }, [items, order]);

  // Designs in the current search, grouped so each one can be shown on its own.
  const current = designs[Math.min(index, Math.max(designs.length - 1, 0))] ?? null;
  const colours = current?.variants ?? [];
  const shownColour = colours.find((variant) => variant.colorVariantId === activeColour) ?? colours.find((variant) => variant.imageUrl) ?? colours[0] ?? null;

  // Saves are queued one after another, so an older save can't finish after a newer one.
  const queue = useRef(Promise.resolve());
  const timer = useRef(null);
  // `base` is the order and start details as they were when the change was made.
  const persist = async (next, base) => {
    const current = base.order;
    if (!current) {
      const first = base.started;
      const lines = linesFrom(next);
      if (lines.length === 0 || !first) return;
      const created = await createOrderFormApi({
        formNumber: first.formNumber,
        formDate: todayIso(),
        partyId: null,
        party: first.party,
        partySync: "document",
        salesman: first.salesman,
        notes: "",
        items: lines,
      });
      navigate(`/stock-out/orders/show/${created.data.id}`, { replace: true });
      return;
    }
    await updateOrderFormApi(current.id, {
      formNumber: current.formNumber,
      formDate: current.formDate,
      partyId: current.partyId ?? null,
      party: current.party,
      partySync: "document",
      salesman: current.salesman ?? "",
      notes: current.notes ?? "",
      items: linesFrom(next),
    });
  };

  const scheduleSave = (next) => {
    clearTimeout(timer.current);
    setSave({ status: "saving", at: null });
    const base = { order, started };
    timer.current = setTimeout(() => {
      queue.current = queue.current
        .then(() => persist(next, base))
        .then(() => setSave({ status: "saved", at: new Date() }))
        .catch((error) => {
          setSave({ status: "error", at: null });
          toast.error(error.message);
        });
    }, 500);
  };

  const setQuantity = (variant, pieces) => {
    const unit = variant.setPieces > 1 ? variant.setPieces : 1;
    const next = Math.max(0, pieces);
    if (next % unit !== 0) return toast.error(`Whole sets only — ${variant.colorName} is ${unit} pcs a set.`);
    const updated = { ...quantities, [variant.colorVariantId]: next };
    setQuantities(updated);
    scheduleSave(updated);
  };

  if (!id && !started) return <StartForm onStart={setStarted} />;
  if (catalog.isPending) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-[#00694C]" /></div>;
  }
  if (id && (orderQuery.isPending || quantities === null)) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-[#00694C]" /></div>;
  }

  const q = quantities ?? {};
  const orderedColours = Object.entries(q).filter(([, pieces]) => pieces > 0);
  const designsInOrder = new Set(orderedColours.map(([colorVariantId]) => colourInfo.get(Number(colorVariantId))?.designId)).size;
  const piecesInOrder = orderedColours.reduce((sum, [, pieces]) => sum + pieces, 0);
  const savedAgo = save.status === "saved" && save.at ? `Saved ${clock(save.at)}` : save.status === "saving" ? "Saving…" : save.status === "error" ? "Not saved — try again" : "";

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full flex-col gap-3">
          <GalleryFilters
            items={items}
            filters={filters}
            onChange={(next) => { setFilters(next); setIndex(0); setActiveColour(null); }}
            mode="all"
            matches={matches}
            visibleCount={visible.length}
          />
          <span className="text-sm text-slate-500">{designs.length ? `Design ${index + 1} of ${designs.length}` : "No designs"}</span>
        </div>
      </div>

      {designs.length === 0 ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-slate-500">No designs match these filters. Clear a filter to see more.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative overflow-hidden rounded-[24px] bg-white">
            <div className="flex aspect-[3/4] items-center justify-center bg-slate-100">
              {shownColour?.imageUrl ? (
                <img src={shownColour.imageUrl} alt={`${current.designCode} ${shownColour.colorName}`} className="h-full w-full object-contain" />
              ) : (
                <span className="text-slate-400">No photo yet</span>
              )}
            </div>
            <button type="button" aria-label="Previous design" onClick={() => setIndex((value) => Math.max(0, value - 1))} className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-40" disabled={index === 0}>
              <ChevronLeft />
            </button>
            <button type="button" aria-label="Next design" onClick={() => setIndex((value) => Math.min(designs.length - 1, value + 1))} className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-40" disabled={index >= designs.length - 1}>
              <ChevronRight />
            </button>
            <div className="p-4">
              <div className="text-lg font-bold text-[#1E1B4B]">{current.designCode}</div>
              <div className="text-sm text-slate-500">{current.designName}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {colours.map((variant) => (
                  <button
                    key={variant.colorVariantId}
                    type="button"
                    onClick={() => setActiveColour(variant.colorVariantId)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${shownColour?.colorVariantId === variant.colorVariantId ? "border-[#00694C] bg-emerald-50" : "border-slate-300"}`}
                  >
                    <span className="size-3.5 rounded-full ring-1 ring-slate-300" style={{ background: variant.colorHex }} />
                    {variant.colorName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] bg-white p-4">
            {colours.map((variant) => {
              const pieces = q[variant.colorVariantId] ?? 0;
              const unit = variant.setPieces > 1 ? variant.setPieces : 1;
              return (
                <div key={variant.colorVariantId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <span className="size-5 rounded-full ring-1 ring-slate-300" style={{ background: variant.colorHex }} />
                  <div className="min-w-[120px] flex-1">
                    <div className="font-semibold text-slate-900">{variant.colorName}</div>
                    <div className="text-xs text-slate-500">
                      {variant.availablePcs} in stock{unit > 1 ? ` · 1 set = ${unit} pcs` : ""}
                    </div>
                  </div>
                  <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300">
                    <button type="button" aria-label="One set less" onClick={() => setQuantity(variant, pieces - unit)} className="grid size-14 place-items-center bg-slate-100 text-slate-700 active:bg-slate-200"><Minus /></button>
                    <div className="grid min-w-[64px] place-items-center font-mono text-xl font-bold">{pieces}</div>
                    <button type="button" aria-label="One set more" onClick={() => setQuantity(variant, pieces + unit)} className="grid size-14 place-items-center bg-slate-100 text-slate-700 active:bg-slate-200"><Plus /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 flex flex-wrap items-center gap-4 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="text-sm text-slate-700">
          <b className="font-mono">{designsInOrder}</b> design{designsInOrder === 1 ? "" : "s"} · <b className="font-mono">{piecesInOrder}</b> pcs
          {(order || started) && <span className="ml-2 text-slate-500">{order?.party?.name ?? started?.party?.name}</span>}
        </div>
        <span className="text-xs text-slate-500">{savedAgo}</span>
        {order && (
          <button type="button" onClick={() => navigate(`/stock-out/orders/${order.id}`)} className="ml-auto h-11 rounded-xl bg-[#00694C] px-5 font-semibold text-white">
            Open order form
          </button>
        )}
      </div>
    </div>
  );
}

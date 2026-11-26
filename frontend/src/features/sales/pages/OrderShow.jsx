import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { sizedImage } from "@/lib/imageUrl.js";
import { useGalleryApi } from "../hooks/useSalesApi.js";
import GalleryFilters from "../components/gallery/GalleryFilters.jsx";
import { createMatcher, freshFilters } from "../utils/galleryFilters.js";
import {
  createOrderFormApi,
  getOrderFormApi,
  reopenOrderFormApi,
  suggestOrderFormNumberApi,
  updateOrderFormApi,
} from "../services/orderForm.api.js";

// The customer's show. The grid is the Gallery's own: the same catalog, filters and card sizes. A
// photo opens its design with quantity steppers; Back returns to the grid. The order is created with
// its first quantity, and each change is saved as you go.

// Card sizes the Gallery offers (the same minimum widths, per screen size).
const CARD_SIZES = [
  { key: "s", label: "S", min: 118, phone: 78 },
  { key: "m", label: "M", min: 160, phone: 110 },
  { key: "l", label: "L", min: 220, phone: 160 },
];

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const clock = (date) => date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// The server takes optional party fields as text or not at all, so empty ones are left out.
const cleanParty = (party) =>
  Object.fromEntries(Object.entries(party ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ""));

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
  const [size, setSize] = useState("m");
  const [openId, setOpenId] = useState(null); // colour whose design is open; null = the grid
  const [quantities, setQuantities] = useState(null); // colorVariantId -> pieces, null until the order loads
  const [save, setSave] = useState({ status: "idle", at: null });

  const order = orderQuery.data?.data ?? null;

  // The same catalog and filters as the Gallery.
  const catalog = useGalleryApi({ mode: "all" });
  const items = useMemo(() => catalog.data?.data?.items ?? [], [catalog.data]);
  const matches = useMemo(() => createMatcher(items, filters, "all"), [items, filters]);
  const visible = useMemo(() => items.filter((item) => matches(item)), [items, matches]);

  // The photos the slider moves through: what the filters leave on screen, or the whole catalog if none.
  const slideList = visible.length ? visible : items;
  const slideAt = slideList.findIndex((item) => item.colorVariantId === openId);
  const slide = (step) => {
    const next = slideList[slideAt + step];
    if (next) setOpenId(next.colorVariantId);
  };

  // Arrow keys move the slider while a photo is open.
  useEffect(() => {
    if (openId == null) return undefined;
    const onKey = (event) => {
      if (event.key === "ArrowRight") slide(1);
      else if (event.key === "ArrowLeft") slide(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Starting from a saved order: its quantities become the current state, once.
  if (order && quantities === null) {
    setQuantities(Object.fromEntries(order.items.map((item) => [item.colorVariantId, item.quantityPcs])));
  }

  // Every colour the screen may need, from the catalog and the saved order.
  const colourById = useMemo(() => {
    const info = new Map();
    for (const item of items) info.set(item.colorVariantId, item);
    for (const item of order?.items ?? []) {
      if (!info.has(item.colorVariantId)) {
        info.set(item.colorVariantId, { ...item, setPieces: 0, availablePcs: item.availablePcs ?? 0 });
      }
    }
    return info;
  }, [items, order]);

  // Saves are queued one after another, so an older save can't finish after a newer one.
  const queue = useRef(Promise.resolve());
  const touchStart = useRef(null);
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
        party: cleanParty(first.party),
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
      party: cleanParty(current.party),
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

  // Saves now instead of waiting for the pause after the last change.
  const saveNow = () => {
    if (!order && !started) return;
    if (!order && linesFrom(quantities ?? {}).length === 0) return toast.error("Add a design first.");
    clearTimeout(timer.current);
    setSave({ status: "saving", at: null });
    const base = { order, started };
    queue.current = queue.current
      .then(() => persist(quantities ?? {}, base))
      .then(() => {
        setSave({ status: "saved", at: new Date() });
        toast.success("Order form saved.");
      })
      .catch((error) => {
        setSave({ status: "error", at: null });
        toast.error(error.message);
      });
  };

  // Only an open order can change. A cancelled or invoiced one is shown, but its quantities are locked.
  const lockedReason = order && order.status !== "OPEN"
    ? (order.status === "CANCELLED" ? "This order form is cancelled." : "This order form has been invoiced.")
    : null;

  const reopen = async () => {
    try {
      await reopenOrderFormApi(order.id);
      toast.success(`${order.formNumber} reopened.`);
      orderQuery.refetch();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const setQuantity = (colour, pieces) => {
    if (lockedReason) return toast.error(`${lockedReason} Quantities can't change.`);
    const unit = colour.setPieces > 1 ? colour.setPieces : 1;
    const next = Math.max(0, pieces);
    if (next % unit !== 0) return toast.error(`Whole sets only — ${colour.colorName} is ${unit} pcs a set.`);
    const updated = { ...quantities, [colour.colorVariantId]: next };
    setQuantities(updated);
    scheduleSave(updated);
  };

  if (!id && !started) return <StartForm onStart={setStarted} />;
  if (catalog.isPending || (id && (orderQuery.isPending || quantities === null))) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-[#00694C]" /></div>;
  }

  const q = quantities ?? {};
  const orderedColours = Object.entries(q).filter(([, pieces]) => pieces > 0);
  const designsInOrder = new Set(orderedColours.map(([colorVariantId]) => colourById.get(Number(colorVariantId))?.designId)).size;
  const piecesInOrder = orderedColours.reduce((sum, [, pieces]) => sum + pieces, 0);
  const savedAgo = save.status === "saved" && save.at ? `Saved ${clock(save.at)}` : save.status === "saving" ? "Saving…" : save.status === "error" ? "Not saved — try again" : "";
  const cardSize = CARD_SIZES.find((option) => option.key === size) ?? CARD_SIZES[1];

  // The open design: every colour of it in the catalog, with the one that was clicked shown first.
  const opened = openId ? colourById.get(openId) : null;
  const designColours = opened ? items.filter((item) => item.designId === opened.designId) : [];
  const shown = designColours.find((colour) => colour.colorVariantId === openId) ?? designColours[0] ?? null;

  return (
    <div className="flex flex-col gap-4 pb-28">
      {lockedReason && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>{lockedReason} Quantities are locked.</span>
          {order.status === "CANCELLED" && (
            <button type="button" onClick={reopen} className="ml-auto h-9 rounded-xl bg-white px-4 font-semibold text-amber-900 ring-1 ring-amber-300">
              Reopen to continue
            </button>
          )}
        </div>
      )}

      {!opened && (
        <>
          <GalleryFilters
            items={items}
            filters={filters}
            onChange={setFilters}
            mode="all"
            matches={matches}
            visibleCount={visible.length}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">{visible.length} photo{visible.length === 1 ? "" : "s"}</span>
            <div className="ml-auto inline-flex rounded-full bg-slate-100 p-1">
              {CARD_SIZES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSize(option.key)}
                  className={cn("rounded-full px-3 py-1 text-xs font-semibold", size === option.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[24px] bg-white p-10 text-center text-slate-500">No photos match these filters.</div>
          ) : (
            <div
              className="grid gap-2.5 max-sm:gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(var(--gmin),1fr))] max-sm:[grid-template-columns:repeat(auto-fill,minmax(var(--gmin-phone),1fr))]"
              style={{ "--gmin": `${cardSize.min}px`, "--gmin-phone": `${cardSize.phone}px` }}
            >
              {visible.map((item) => {
                const pieces = q[item.colorVariantId] ?? 0;
                if (!item.imageUrl) {
                  return (
                    <button
                      key={item.colorVariantId}
                      type="button"
                      onClick={() => setOpenId(item.colorVariantId)}
                      title="No photo in Design Master"
                      className="relative overflow-hidden rounded-[10px] border border-slate-200 bg-white text-left opacity-85"
                    >
                      <div className="relative aspect-[4/5] bg-[repeating-linear-gradient(45deg,#F1F5F9,#F1F5F9_10px,#fff_10px,#fff_20px)]">
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-[11px] text-slate-400">
                          <AlertTriangle className="h-[18px] w-[18px]" />
                          <span>No photo</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-1.5 bg-gradient-to-b from-transparent to-slate-900/85 px-2 pb-1.5 pt-[18px] text-[11.5px] text-white">
                          <b className="shrink-0 font-mono">{item.designCode}</b>
                          <span className="truncate text-slate-200">{item.colorName}</span>
                        </div>
                      </div>
                    </button>
                  );
                }
                return (
                  <button
                    key={item.colorVariantId}
                    type="button"
                    onClick={() => setOpenId(item.colorVariantId)}
                    aria-label={`${item.designCode} ${item.colorName}`}
                    className={cn(
                      "group relative overflow-hidden rounded-[10px] border bg-white text-left transition-shadow",
                      pieces > 0 ? "border-emerald-600 shadow-[0_0_0_2px_#059669]" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className="relative aspect-[4/5] bg-slate-100">
                      <img
                        src={sizedImage(item.imageUrl, 480)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                      {pieces > 0 && (
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-[7px] bg-emerald-600 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white shadow">
                          <Check className="h-3 w-3" strokeWidth={3} /> {pieces}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-1.5 bg-gradient-to-b from-transparent to-slate-900/85 px-2 pb-1.5 pt-[18px] text-[11.5px] text-white">
                        <b className="shrink-0 font-mono">{item.designCode}</b>
                        <span className="truncate text-slate-200">{item.colorName}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {opened && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setOpenId(null)} className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <ArrowLeft className="h-4 w-4" /> Back to photos
            </button>
            <div
              className="relative flex h-[min(70vh,640px)] items-center justify-center overflow-hidden rounded-[20px] bg-slate-100 p-3"
              onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (start == null) return;
                const dx = event.changedTouches[0].clientX - start;
                if (Math.abs(dx) > 50) slide(dx < 0 ? 1 : -1);
              }}
            >
              {shown?.imageUrl ? (
                <img src={sizedImage(shown.imageUrl, 1000)} alt={`${opened.designCode} ${shown.colorName}`} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-slate-400">No photo yet</span>
              )}
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => slide(-1)}
                disabled={slideAt <= 0}
                className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-30"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => slide(1)}
                disabled={slideAt < 0 || slideAt >= slideList.length - 1}
                className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow disabled:opacity-30"
              >
                <ChevronRight />
              </button>
              <span className="absolute bottom-2 right-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {slideAt + 1} of {slideList.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {designColours.map((colour) => (
                <button
                  key={colour.colorVariantId}
                  type="button"
                  onClick={() => setOpenId(colour.colorVariantId)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                    shown?.colorVariantId === colour.colorVariantId ? "border-[#00694C] bg-emerald-50" : "border-slate-300 bg-white",
                  )}
                >
                  <span className="size-3.5 rounded-full ring-1 ring-slate-300" style={{ background: colour.colorHex }} />
                  {colour.colorName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] bg-white p-4">
            <div>
              <div className="text-lg font-bold text-[#1E1B4B]">{opened.designCode}</div>
              <div className="text-sm text-slate-500">{opened.designName}</div>
            </div>
            {designColours.map((colour) => {
              const pieces = q[colour.colorVariantId] ?? 0;
              const unit = colour.setPieces > 1 ? colour.setPieces : 1;
              return (
                <div key={colour.colorVariantId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <span className="size-5 rounded-full ring-1 ring-slate-300" style={{ background: colour.colorHex }} />
                  <div className="min-w-[120px] flex-1">
                    <div className="font-semibold text-slate-900">{colour.colorName}</div>
                    <div className="text-xs text-slate-500">
                      {colour.availablePcs} in stock{unit > 1 ? ` · 1 set = ${unit} pcs` : ""}
                    </div>
                  </div>
                  <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300">
                    <button type="button" aria-label="One set less" disabled={Boolean(lockedReason)} onClick={() => setQuantity(colour, pieces - unit)} className="grid size-14 place-items-center bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-40"><Minus /></button>
                    <div className="grid min-w-[64px] place-items-center font-mono text-xl font-bold">{pieces}</div>
                    <button type="button" aria-label="One set more" disabled={Boolean(lockedReason)} onClick={() => setQuantity(colour, pieces + unit)} className="grid size-14 place-items-center bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-40"><Plus /></button>
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
        {!lockedReason && (
          <button type="button" onClick={saveNow} className="ml-auto h-11 rounded-xl border border-[#00694C] px-5 font-semibold text-[#00694C]">
            Save order form
          </button>
        )}
        {order && (
          <button type="button" onClick={() => navigate(`/stock-out/orders/${order.id}`)} className="h-11 rounded-xl bg-[#00694C] px-5 font-semibold text-white">
            Open order form
          </button>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Receipt,
  Search,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGalleryApi } from "../hooks/useSalesApi.js";
import { inr } from "../utils/format.js";
import PhotoLightbox from "../components/PhotoLightbox.jsx";
import GalleryFilters from "../components/gallery/GalleryFilters.jsx";
import { createMatcher, freshFilters } from "../utils/galleryFilters.js";

const MODES = [
  {
    key: "orderForm",
    label: "By Order Form",
    hint: "Enter an order form number",
    Icon: FileText,
  },
  {
    key: "invoice",
    label: "By Invoice",
    hint: "Enter an invoice number",
    Icon: Receipt,
  },
  {
    key: "all",
    label: "All designs",
    hint: "Browse and filter everything",
    Icon: Search,
  },
];

const Gallery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState(searchParams.get("mode") ?? "all");
  const [numberInput, setNumberInput] = useState(
    searchParams.get("number") ?? "",
  );
  const [submittedNumber, setSubmittedNumber] = useState(
    searchParams.get("number") ?? "",
  );
  // Filtering happens here, over whatever was fetched — the whole catalogue or one document —
  // so each facet can show live counts. Reset whenever what's being filtered changes.
  const [filters, setFilters] = useState(freshFilters);
  // colorVariantId → the selected gallery item itself (not just `true`), so a pick survives a
  // new search, filter or order/invoice lookup that no longer shows it — Share and Download
  // work from this, not from what's on screen. Starts empty: the salesperson picks.
  const [selected, setSelected] = useState({});
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const {
    data: response,
    isPending,
    isError,
    error,
  } = useGalleryApi(
    { mode, number: submittedNumber },
    mode === "all" || Boolean(submittedNumber),
  );

  const items = useMemo(() => response?.data?.items ?? [], [response]);
  const source = response?.data?.source;

  const matches = useMemo(
    () => createMatcher(items, filters, mode),
    [items, filters, mode],
  );
  const visible = useMemo(
    () => items.filter((item) => matches(item)),
    [items, matches],
  );

  const selectable = visible.filter((item) => item.hasPhoto);
  const withoutPhoto = visible.filter((item) => !item.hasPhoto);
  // Every pick so far, across searches — what Share/Download send.
  const chosen = Object.values(selected);
  const chosenDesignCount = new Set(chosen.map((item) => item.designId)).size;
  // "Select all" only ever concerns the photos currently on screen.
  const allSelected =
    selectable.length > 0 &&
    selectable.every((item) => selected[item.colorVariantId]);

  const toggleSelected = (item) =>
    setSelected((previous) => {
      const next = { ...previous };
      if (next[item.colorVariantId]) delete next[item.colorVariantId];
      else next[item.colorVariantId] = item;
      return next;
    });

  // Adds (or removes) just the on-screen photos — picks from earlier searches are kept.
  const toggleAllVisible = () =>
    setSelected((previous) => {
      const next = { ...previous };
      for (const item of selectable) {
        if (allSelected) delete next[item.colorVariantId];
        else next[item.colorVariantId] = item;
      }
      return next;
    });

  const fetchNumber = (number) => {
    setSubmittedNumber(number);
    setFilters(freshFilters());
  };

  // Grouped by designId, not code: a code is only unique within a pattern, so two designs can
  // share one — each gets its own group (the header shows its pattern to tell them apart).
  const grouped = useMemo(() => {
    const byDesign = new Map();

    for (const item of visible) {
      const group = byDesign.get(item.designId) ?? {
        designId: item.designId,
        designCode: item.designCode,
        designName: item.designName,
        items: [],
      };
      group.items.push(item);
      byDesign.set(item.designId, group);
    }

    return [...byDesign.values()];
  }, [visible]);

  const message = () => {
    const head =
      source?.kind === "orderForm"
        ? `Designs for order form ${source.number} (${source.party})`
        : source?.kind === "invoice"
          ? `Designs in invoice ${source.number} (${source.party})`
          : "Our designs";

    return `${head}:\n${chosen.map((item) => `• ${item.designCode} ${item.designName} – ${item.colorName}`).join("\n")}`;
  };

  // Sharing real image files needs them as File objects, and the photos live on a CDN — so they
  // are fetched first. A browser without file sharing falls back to copying the text.
  const share = async () => {
    if (chosen.length === 0) return toast.error("Select at least one photo.");

    const text = message();

    try {
      const files = await Promise.all(
        chosen.map(async (item) => {
          const blob = await fetch(item.imageUrl).then((res) => res.blob());
          return new File(
            [blob],
            `${item.designCode}-${item.colorName.replace(/\s+/g, "-")}.jpg`,
            { type: blob.type || "image/jpeg" },
          );
        }),
      );

      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, text, title: "Designs" });
        return;
      }
    } catch (shareError) {
      if (shareError?.name === "AbortError") return;
      // Fall through to the text fallback below.
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.info(
        "This browser can't hand photos to other apps — the message was copied instead. Download the photos and attach them.",
      );
    } catch {
      toast.error(
        "Couldn't share or copy here. Download the photos and attach them manually.",
      );
    }
  };

  const download = () => {
    if (chosen.length === 0) return toast.error("Select at least one photo.");

    chosen.forEach((item, index) => {
      // Spaced out, or the browser blocks the burst as a popup flood.
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = item.imageUrl;
        link.download = `${item.designCode}-${item.colorName.replace(/\s+/g, "-")}.jpg`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, index * 250);
    });

    toast.success(
      chosen.length > 1
        ? `Downloading ${chosen.length} photos… if your browser asks, allow multiple downloads.`
        : "Downloading 1 photo.",
    );
  };

  return (
    <div className="stock-out flex h-full flex-col gap-4 pb-4 font-sans">
      <div className="glass-card shrink-0 rounded-[24px] p-5">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E1B4B]">
          Gallery
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map(({ key, label, hint, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === mode) return;
                setMode(key);
                fetchNumber("");
                setNumberInput("");
              }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                mode === key
                  ? "border-emerald-500 bg-emerald-50/70"
                  : "border-white/60 bg-white/50 hover:border-emerald-200",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  mode === key
                    ? "bg-[#00694C] text-white"
                    : "bg-white/70 text-[#1E1B4B]/60",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <b className="block text-sm text-[#1E1B4B]">{label}</b>
                <span className="text-xs text-[#1E1B4B]/55">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {mode !== "all" && (
          <div className="mt-4">
            <div className="flex max-w-xl gap-2">
              <input
                className="pill-input font-mono"
                value={numberInput}
                onChange={(event) => setNumberInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") fetchNumber(numberInput.trim());
                }}
                placeholder={
                  mode === "orderForm"
                    ? "Type the order form number, e.g. OF-1022"
                    : "Type the invoice number, e.g. INV-2026-041"
                }
              />
              <button
                type="button"
                onClick={() => fetchNumber(numberInput.trim())}
                className="shrink-0 rounded-lg bg-[#00694C] px-5 text-xs font-semibold text-white hover:bg-[#00563e]"
              >
                Fetch photos
              </button>
            </div>
          </div>
        )}

        {!isError && items.length > 0 && (
          <div className="mt-4">
            <GalleryFilters
              items={items}
              filters={filters}
              onChange={setFilters}
              mode={mode}
              matches={matches}
              visibleCount={visible.length}
            />
          </div>
        )}
      </div>

      {mode !== "all" && !submittedNumber ? (
        <div className="glass-card flex flex-col items-center justify-center gap-2 rounded-[24px] p-12 text-center">
          <ImageIcon className="h-10 w-10 text-[#1E1B4B]/20" />
          <b className="text-[#1E1B4B]">
            Enter {mode === "orderForm" ? "an order form" : "an invoice"} number
            to see its photos
          </b>
          <span className="max-w-[50ch] text-sm text-[#1E1B4B]/55">
            {mode === "orderForm"
              ? "Every design and colour the customer asked for will appear here."
              : "Every design and colour actually billed will appear here, including extras."}
          </span>
        </div>
      ) : isError ? (
        <div className="glass-card flex flex-col items-center justify-center gap-2 rounded-[24px] p-12 text-center">
          <AlertTriangle className="h-9 w-9 text-amber-500" />
          <b className="text-[#1E1B4B]">Nothing found</b>
          <span className="text-sm text-[#1E1B4B]/55">{error.message}</span>
        </div>
      ) : isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-[#00694C]" />
        </div>
      ) : (
        <div className="glass-card flex min-h-[50dvh] flex-1 flex-col rounded-[24px] p-5 lg:min-h-0">
          {source?.number && (
            <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E1B4B]/45">
                  {source.kind === "invoice" ? "Invoice" : "Order form"}
                </span>
                <div className="font-mono text-base font-bold text-[#1E1B4B]">
                  {source.number}
                </div>
                <div className="text-xs text-[#1E1B4B]/60">
                  <b>{source.party}</b> · {source.totalPcs} pcs
                  {source.totalAmount != null &&
                    ` · ${inr(source.totalAmount)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    source.kind === "invoice"
                      ? `/stock-out/invoices/${source.id}`
                      : `/stock-out/orders/${source.id}`,
                  )
                }
                className="neu-button rounded-full px-4 py-2 text-xs font-semibold text-[#1E1B4B]"
              >
                Open {source.kind === "invoice" ? "invoice" : "order form"}
              </button>
            </div>
          )}

          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={selectable.length === 0}
              onClick={toggleAllVisible}
              className="flex items-center gap-2 text-sm font-semibold text-[#1E1B4B] disabled:opacity-40"
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border",
                  allSelected
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[#1E1B4B]/20 bg-white",
                )}
              >
                {allSelected && <Check className="h-3 w-3" />}
              </span>
              Select all{" "}
              <span className="text-[#1E1B4B]/40">({selectable.length})</span>
            </button>

            <span className="text-xs text-[#1E1B4B]/55">
              {chosen.length} selected
            </span>
          </div>

          {withoutPhoto.length > 0 && (
            <div className="mb-4 flex shrink-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <b>
                  {withoutPhoto.length} variant
                  {withoutPhoto.length === 1 ? " has" : "s have"} no photo
                </b>{" "}
                in Design Master (
                {withoutPhoto
                  .map((item) => `${item.designCode} ${item.colorName}`)
                  .join(", ")}
                ).
                {withoutPhoto.length === 1 ? " It" : " They"} can't be shared
                until a photo is added.
              </span>
            </div>
          )}

          {/* The page is pinned to the viewport and only the photos scroll, so a long result never
                        pushes the header and filters out of view. On small screens the card keeps at least half
                        the screen height so a tall header can't squeeze the photos away; the page scrolls the rest. */}
          <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 pb-1">
            {items.length === 0 ? (
              <div className="p-10 text-center">
                <b className="block text-sm text-[#1E1B4B]">
                  No designs here yet
                </b>
                <span className="text-sm text-[#1E1B4B]/55">
                  Designs registered in Design Master will appear here.
                </span>
              </div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center">
                <b className="block text-sm text-[#1E1B4B]">
                  No photos match these filters
                </b>
                <span className="text-sm text-[#1E1B4B]/55">
                  Remove a filter chip above, or{" "}
                  <button
                    type="button"
                    onClick={() => setFilters(freshFilters())}
                    className="font-semibold text-[#00694C] hover:underline"
                  >
                    clear all filters
                  </button>
                  .
                </span>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.designId} className="mb-6 last:mb-0">
                  <div className="mb-2.5 border-b border-white/60 pb-2 text-sm">
                    <b className="text-[#1E1B4B]">{group.designCode}</b>
                    <span className="ml-2 text-xs text-[#1E1B4B]/55">
                      {group.designName}
                    </span>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
                    {group.items.map((item) => {
                      const isSelected = Boolean(selected[item.colorVariantId]);
                      const index = selectable.findIndex(
                        (candidate) =>
                          candidate.colorVariantId === item.colorVariantId,
                      );

                      return (
                        <div
                          key={item.colorVariantId}
                          className={cn(
                            "overflow-hidden rounded-2xl border bg-white transition-shadow",
                            isSelected
                              ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]"
                              : "border-white/70",
                          )}
                        >
                          <div className="relative aspect-[4/5] bg-slate-100">
                            {item.hasPhoto ? (
                              <>
                                <img
                                  src={item.imageUrl}
                                  alt={`${item.designCode} ${item.colorName}`}
                                  loading="lazy"
                                  className="h-full w-full cursor-zoom-in object-cover"
                                  onClick={() => setLightboxIndex(index)}
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleSelected(item)}
                                  className={cn(
                                    "absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-lg shadow",
                                    isSelected
                                      ? "bg-emerald-600 text-white"
                                      : "bg-white/90 text-transparent",
                                  )}
                                  aria-label={`Select ${item.colorName}`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-[#1E1B4B]/40">
                                <AlertTriangle className="h-5 w-5" />
                                <span>
                                  No photo in
                                  <br />
                                  Design Master
                                </span>
                              </div>
                            )}

                            {item.isExtra && (
                              <span className="absolute right-2.5 top-2.5 rounded bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                EXTRA
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: item.colorHex }}
                            />
                            <b className="truncate text-sm text-[#1E1B4B]">
                              {item.colorName}
                            </b>
                          </div>
                          <div className="px-3 pb-3 text-[11.5px] text-[#1E1B4B]/55">
                            {item.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-20 shrink-0">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#1E1B4B] px-5 py-3 text-white shadow-2xl">
            <div>
              <b className="text-sm">
                {chosen.length} photo{chosen.length === 1 ? "" : "s"} selected
              </b>
              <div className="text-[11.5px] text-white/60">
                {`from ${chosenDesignCount} design${chosenDesignCount === 1 ? "" : "s"}`}
                {source?.party ? ` · for ${source.party}` : ""}
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setSelected({})}
                className="rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={download}
                className="flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              <button
                type="button"
                onClick={share}
                className="flex items-center gap-1.5 rounded-full bg-[#00694C] px-4 py-1.5 text-xs font-semibold hover:bg-[#00563e]"
              >
                <Share2 className="h-3.5 w-3.5" /> Share {chosen.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          items={selectable}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          selected={selected}
          onToggle={(colorVariantId) => {
            const item = selectable.find(
              (candidate) => candidate.colorVariantId === colorVariantId,
            );
            if (item) toggleSelected(item);
          }}
        />
      )}
    </div>
  );
};

export default Gallery;

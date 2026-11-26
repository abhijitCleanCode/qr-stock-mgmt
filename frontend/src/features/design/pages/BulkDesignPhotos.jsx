import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { ArrowLeft, ImagePlus, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAllDesignsApi, replaceVariantPhotosApi } from "../services/design.api.js";
import { matchPhotos } from "../utils/bulkPhotoMatch.js";

// The design list is paged at 100, so every page is read before matching.
async function loadAllDesigns() {
  const first = await getAllDesignsApi({ page: 1, limit: 100 });
  const designs = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    const next = await getAllDesignsApi({ page, limit: 100 });
    designs.push(...next.data);
  }
  return designs;
}

// Every active colour across all designs, in the shape the matcher reads.
const flattenVariants = (designs) =>
  designs.flatMap((design) =>
    (design.colorVariants ?? []).map((variant) => ({
      colorVariantId: variant.id,
      designCode: design.code,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      hasPhoto: Boolean(variant.imageUrl),
      label: `${design.code} · ${variant.colorName}`,
    })),
  );

// Photos go up in batches, so one request never carries too many files.
const BATCH = 20;

function Section({ title, count, tone, children }) {
  return (
    <section className="rounded-xl border border-slate-200">
      <div className={cn("flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em]", tone)}>
        {title} <span className="font-mono">{count}</span>
      </div>
      {count === 0 ? <div className="px-4 py-3 text-[13px] text-slate-400">None.</div> : <div className="divide-y divide-slate-100">{children}</div>}
    </section>
  );
}

export default function BulkDesignPhotos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);

  const { data: designs, isLoading, isError, error } = useQuery({
    queryKey: ["designs", "all-for-photos"],
    queryFn: loadAllDesigns,
    staleTime: 60_000,
  });
  const variants = useMemo(() => flattenVariants(designs ?? []), [designs]);

  const [files, setFiles] = useState([]);
  const [review, setReview] = useState(null);
  const [accepted, setAccepted] = useState(() => new Set()); // suggested names the user confirmed
  const [choices, setChoices] = useState({}); // ambiguous name -> chosen colour id
  const [progress, setProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const pick = (list) => {
    const picked = [...list];
    setFiles(picked);
    setReview(matchPhotos(picked.map((file) => file.name), variants));
    setAccepted(new Set());
    setChoices({});
    setProgress(null);
  };

  // What will be uploaded: exact matches, confirmed suggestions, and ambiguous names with a chosen colour.
  // A colour is only ever given one photo, so a second claim on it is left out and counted as a conflict.
  const { plan, conflicts } = useMemo(() => {
    if (!review) return { plan: [], conflicts: [] };
    const candidates = [
      ...review.matched.map((item) => ({ fileName: item.fileName, variant: item.variant })),
      ...review.suggested.filter((item) => accepted.has(item.fileName)).map((item) => ({ fileName: item.fileName, variant: item.variant })),
      ...review.ambiguous
        .filter((item) => choices[item.fileName])
        .map((item) => ({ fileName: item.fileName, variant: item.variants.find((v) => v.colorVariantId === Number(choices[item.fileName])) }))
        .filter((item) => item.variant),
    ];
    const seen = new Set();
    const planned = [];
    const clashes = [];
    for (const item of candidates) {
      if (seen.has(item.variant.colorVariantId)) clashes.push(item);
      else {
        seen.add(item.variant.colorVariantId);
        planned.push(item);
      }
    }
    return { plan: planned, conflicts: clashes };
  }, [review, accepted, choices]);

  const toggleAccepted = (fileName) =>
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });

  const acceptAllSuggestions = () => setAccepted(new Set(review.suggested.map((item) => item.fileName)));

  const upload = async () => {
    const byName = new Map(files.map((file) => [file.name, file]));
    const total = plan.length;
    let done = 0;
    setIsUploading(true);
    setProgress({ done, total });
    try {
      for (let start = 0; start < plan.length; start += BATCH) {
        const batch = plan.slice(start, start + BATCH);
        await replaceVariantPhotosApi(
          batch.map((item) => byName.get(item.fileName)),
          batch.map((item) => item.variant.colorVariantId),
        );
        done += batch.length;
        setProgress({ done, total });
      }
      toast.success(`${done} photo${done === 1 ? "" : "s"} uploaded.`);
      setFiles([]);
      setReview(null);
    } catch (uploadError) {
      toast.error(`${done} of ${total} uploaded before an error: ${uploadError.message}`);
    } finally {
      // Whatever went through is saved; refresh so the list shows it.
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <button type="button" onClick={() => navigate("/designs")} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Design Master
        </button>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Bulk photo upload</h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          Name each photo <span className="font-mono">design code-colour</span>, for example <span className="font-mono">KP 557-Yellow.jpg</span>. Small spelling
          differences are suggested for you to confirm. Nothing uploads until you confirm it.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-4">
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => pick(event.target.files)} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="gap-2" disabled={isLoading || isUploading}>
          <ImagePlus className="size-4" /> Choose photos
        </Button>
        <span className="text-[13px] text-slate-500">
          {files.length ? `${files.length} file${files.length === 1 ? "" : "s"} chosen` : "JPG, PNG or WEBP. Select a whole folder's worth at once."}
        </span>
        {isLoading && <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading designs…</span>}
        {isError && <span className="ml-auto text-[13px] text-red-600">{error.message}</span>}
      </div>

      {review && (
        <div className="flex flex-col gap-4">
          <Section title="Matched — will upload" count={review.matched.length} tone="bg-emerald-50 text-emerald-800">
            {review.matched.map((item) => (
              <div key={item.fileName} className="flex items-center gap-3 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate font-mono text-slate-700">{item.fileName}</span>
                <span className="text-slate-400">→</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{item.variant.label}</span>
                {item.variant.hasPhoto && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">replaces photo</span>}
              </div>
            ))}
          </Section>

          <Section title="Close matches — confirm each one" count={review.suggested.length} tone="bg-amber-50 text-amber-800">
            {review.suggested.length > 1 && (
              <div className="flex justify-end px-4 py-2">
                <button type="button" onClick={acceptAllSuggestions} className="text-[12.5px] font-semibold text-emerald-700 hover:underline">Accept all</button>
              </div>
            )}
            {review.suggested.map((item) => (
              <label key={item.fileName} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[13.5px]">
                <input type="checkbox" checked={accepted.has(item.fileName)} onChange={() => toggleAccepted(item.fileName)} className="size-4 accent-emerald-600" />
                <span className="min-w-0 flex-1 truncate font-mono text-slate-700">{item.fileName}</span>
                <span className="text-slate-400">→</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{item.variant.label}</span>
                <span className="text-[11.5px] text-slate-400">{item.typos} letter{item.typos === 1 ? "" : "s"} off</span>
              </label>
            ))}
          </Section>

          <Section title="Could be more than one colour — choose one" count={review.ambiguous.length} tone="bg-violet-50 text-violet-800">
            {review.ambiguous.map((item) => (
              <div key={item.fileName} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0 flex-1 truncate font-mono text-slate-700">{item.fileName}</span>
                <select
                  value={choices[item.fileName] ?? ""}
                  onChange={(event) => setChoices((current) => ({ ...current, [item.fileName]: event.target.value }))}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px]"
                >
                  <option value="">Choose a colour…</option>
                  {item.variants.map((variant) => (
                    <option key={variant.colorVariantId} value={variant.colorVariantId}>{variant.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </Section>

          <Section title="No colour found — check the name" count={review.unmatched.length} tone="bg-red-50 text-red-700">
            {review.unmatched.map((fileName) => (
              <div key={fileName} className="px-4 py-2.5 font-mono text-[13px] text-slate-600">{fileName}</div>
            ))}
          </Section>

          {(review.skipped.length > 0 || review.duplicates.length > 0 || conflicts.length > 0) && (
            <Section
              title="Left out"
              count={review.skipped.length + review.duplicates.length + conflicts.length}
              tone="bg-slate-100 text-slate-600"
            >
              {review.skipped.map((fileName) => (
                <div key={`skip-${fileName}`} className="px-4 py-2.5 text-[13px] text-slate-600"><span className="font-mono">{fileName}</span> — not a JPG, PNG or WEBP image</div>
              ))}
              {review.duplicates.map((item) => (
                <div key={`dup-${item.fileName}`} className="px-4 py-2.5 text-[13px] text-slate-600"><span className="font-mono">{item.fileName}</span> — a second photo for {item.variant.label}</div>
              ))}
              {conflicts.map((item) => (
                <div key={`clash-${item.fileName}`} className="px-4 py-2.5 text-[13px] text-slate-600"><span className="font-mono">{item.fileName}</span> — {item.variant.label} already has a photo chosen</div>
              ))}
            </Section>
          )}

          {review.withoutPhoto.length > 0 && (
            <p className="text-[12.5px] text-slate-500">
              {review.withoutPhoto.length} colour{review.withoutPhoto.length === 1 ? "" : "s"} still without a photo after this batch.
            </p>
          )}

          <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <span className="text-[13.5px] text-slate-700">
              <b className="font-mono text-slate-900">{plan.length}</b> photo{plan.length === 1 ? "" : "s"} ready
              {progress && isUploading && <span className="text-slate-500"> · uploading {progress.done} of {progress.total}</span>}
            </span>
            <Button
              type="button"
              onClick={upload}
              disabled={plan.length === 0 || isUploading}
              className="ml-auto gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload {plan.length} photo{plan.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

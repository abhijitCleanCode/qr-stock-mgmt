import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getVariantKey } from "../../utils/variantKey";
import { getVariantDisplayCode } from "../../utils/variantDisplay";

const DEFECT_CATEGORIES = [
  "Oil stain on collar",
  "Stitching rip on sleeve",
  "Zari thread cut",
  "Size tag mismatch",
  "Stitching unevenness",
  "Other (see remarks)",
];

const SOURCES = [
  ["SET", "Full sets"],
  ["SEMI", "Semi sets"],
  ["LOOSE", "Loose pieces"],
];

const EMPTY_GROUPS = {};

const labelFor = (sizes, sizeId) => sizes.find((size) => String(size.id) === String(sizeId))?.sizeLabel ?? sizeId;
const labelsOf = (sizes, sizeIds) => sizeIds.map((sizeId) => labelFor(sizes, sizeId)).join("-");

const chipClass = (on) =>
  cn(
    "h-9 min-w-[44px] rounded-[9px] border-[1.5px] px-3 text-[12px] font-bold",
    on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
  );

const selectClass = (hasError) =>
  cn(
    "h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/10",
    hasError && "border-red-500",
  );

const Stepper = ({ value, min = 0, max, onChange, label }) => (
  <div className="flex items-center gap-1" aria-label={label}>
    <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="size-8 rounded-md border border-slate-300 bg-white font-bold text-slate-700 disabled:text-slate-300">−</button>
    <span className="w-8 text-center text-sm font-bold text-slate-900">{value}</span>
    <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="size-8 rounded-md border border-slate-300 bg-white font-bold text-slate-700 disabled:text-slate-300">+</button>
  </div>
);

// Multi-select of sizes. Each selected size is one defective piece in the group.
const SizeChips = ({ sizes, selected, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {sizes.map((size) => (
      <button key={size.id} type="button" aria-pressed={selected.includes(size.id)} onClick={() => onToggle(size.id)} className={chipClass(selected.includes(size.id))}>
        {size.sizeLabel}
      </button>
    ))}
  </div>
);

const CategorySelect = ({ value, onChange }) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass(!value)}>
    <option value="">Pick a category</option>
    {DEFECT_CATEGORIES.map((category) => (
      <option key={category} value={category}>{category}</option>
    ))}
  </select>
);

// Each defect group chooses its own outcome: keep the piece in stock (factory seconds), or return it.
const KeepOrReturn = ({ keep, onChange }) => (
  <div className="flex flex-wrap gap-2">
    <button type="button" aria-pressed={keep} onClick={() => onChange(true)} className={chipClass(keep)}>Keep in stock</button>
    <button type="button" aria-pressed={!keep} onClick={() => onChange(false)} className={chipClass(!keep)}>Return to jobber</button>
  </div>
);

const GroupCard = ({ children, onRemove }) => (
  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    {children}
    <div className="text-right">
      <button type="button" onClick={onRemove} className="text-xs font-medium text-red-600 hover:underline">Remove group</button>
    </div>
  </div>
);

const VariantQcCard = ({ variant, totals, config, breakdown, groups, onGroupsChange, error }) => {
  const sizes = totals.sizes ?? [];
  const setSizes = sizes.filter((size) => size.includedInSet).map((size) => ({ id: String(size.id), sizeLabel: size.sizeLabel }));

  // Semi set types keep their bundle index so a group keeps pointing at the same bundle.
  const semiTypes = config.bundles
    .map((bundle, index) => ({
      key: String(index),
      quantity: Number(bundle.quantity) || 0,
      sizes: Object.keys(bundle.composition)
        .filter((sizeId) => Number(bundle.composition[sizeId]) > 0)
        .map((sizeId) => ({ id: String(sizeId), sizeLabel: labelFor(sizes, sizeId) })),
    }))
    .filter((type) => type.quantity > 0 && type.sizes.length > 0);

  const looseRows = Object.entries(config.loosePieces)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([sizeId, quantity]) => ({ id: String(sizeId), sizeLabel: labelFor(sizes, sizeId), quantity: Number(quantity) }));

  const setGroups = groups.sets ?? [];
  const semiGroups = groups.semiSets ?? [];
  const looseDefects = groups.loose ?? [];

  // Which sources are open. A source with groups starts open; closing one clears its groups.
  const [openSources, setOpenSources] = useState(() => ({
    SET: setGroups.length > 0,
    SEMI: semiGroups.length > 0,
    LOOSE: looseDefects.length > 0,
  }));

  const emit = (patch) => onGroupsChange({ sets: setGroups, semiSets: semiGroups, loose: looseDefects, ...patch });

  const toggleSource = (source) => {
    const nextOpen = !openSources[source];
    setOpenSources((prev) => ({ ...prev, [source]: nextOpen }));
    if (!nextOpen) {
      if (source === "SET") emit({ sets: [] });
      if (source === "SEMI") emit({ semiSets: [] });
      if (source === "LOOSE") emit({ loose: [] });
    }
  };

  // ---- Full sets ----
  const setsUsedByOthers = (index) => setGroups.reduce((sum, group, position) => (position === index ? sum : sum + group.count), 0);
  const updateSetGroup = (index, patch) => emit({ sets: setGroups.map((group, position) => (position === index ? { ...group, ...patch } : group)) });
  const toggleSetSize = (index, sizeId) => {
    const current = setGroups[index].sizeIds;
    updateSetGroup(index, { sizeIds: current.includes(sizeId) ? current.filter((id) => id !== sizeId) : [...current, sizeId] });
  };

  // ---- Semi sets ----
  const semiUsedByOthers = (index, semiKey) =>
    semiGroups.reduce((sum, group, position) => (position === index || group.semiKey !== semiKey ? sum : sum + group.count), 0);
  const updateSemiGroup = (index, patch) => emit({ semiSets: semiGroups.map((group, position) => (position === index ? { ...group, ...patch } : group)) });
  const toggleSemiSize = (index, sizeId) => {
    const current = semiGroups[index].sizeIds;
    updateSemiGroup(index, { sizeIds: current.includes(sizeId) ? current.filter((id) => id !== sizeId) : [...current, sizeId] });
  };

  // ---- Loose ----
  const looseEntry = (sizeId) => looseDefects.find((row) => String(row.sizeId) === sizeId);
  const setLoose = (sizeId, patch) => {
    const exists = looseDefects.some((row) => String(row.sizeId) === sizeId);
    const next = exists
      ? looseDefects.map((row) => (String(row.sizeId) === sizeId ? { ...row, ...patch } : row))
      : [...looseDefects, { sizeId, quantity: 0, category: "", keep: true, ...patch }];
    emit({ loose: next });
  };

  const returnedCount = breakdown.returnedCount;
  const keptCount = breakdown.keptCount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded-full" style={{ backgroundColor: variant.colorHex }} />
          <span className="text-xs font-bold text-slate-900">
            {variant.designCode ? `${variant.designCode} · ` : ""}
            {variant.colorName} <span className="font-mono text-[11px] text-slate-400">({getVariantDisplayCode(variant)})</span>
          </span>
        </div>
        <span className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          Defective pieces: {breakdown.defectiveCount}
          <span className="ml-1 font-normal text-red-600">(kept in stock: {keptCount} · returned: {returnedCount})</span>
        </span>
      </div>

      {/* Which kinds of pieces are defective */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="self-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">Defective from:</span>
        {SOURCES.map(([source, title]) => (
          <button key={source} type="button" aria-pressed={openSources[source]} onClick={() => toggleSource(source)} className={chipClass(openSources[source])}>
            {title}
          </button>
        ))}
      </div>

      {/* Full sets */}
      {openSources.SET && (
        <section className="mb-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-800">Full sets ({totals.setsTotal} received)</h4>
          {setGroups.map((group, index) => {
            const remaining = Math.max(0, totals.setsTotal - setsUsedByOthers(index));
            return (
              <GroupCard key={index} onRemove={() => emit({ sets: setGroups.filter((_, position) => position !== index) })}>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-medium text-slate-600">Number of sets</span>
                  <Stepper value={group.count} min={1} max={Math.max(1, remaining)} onChange={(count) => updateSetGroup(index, { count })} label="Number of sets" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Defective sizes in each set</span>
                  <SizeChips sizes={setSizes} selected={group.sizeIds} onToggle={(sizeId) => toggleSetSize(index, sizeId)} />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CategorySelect value={group.category} onChange={(category) => updateSetGroup(index, { category })} />
                  <KeepOrReturn keep={group.keep} onChange={(keep) => updateSetGroup(index, { keep })} />
                </div>
              </GroupCard>
            );
          })}
          <button
            type="button"
            disabled={setSizes.length === 0 || setsUsedByOthers(setGroups.length) >= totals.setsTotal}
            onClick={() => emit({ sets: [...setGroups, { count: 1, sizeIds: [], category: "", keep: true }] })}
            className="text-xs font-semibold text-emerald-700 hover:underline disabled:text-slate-400"
          >
            + Add sets
          </button>
        </section>
      )}

      {/* Semi sets */}
      {openSources.SEMI && (
        <section className="mb-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-800">Semi sets</h4>
          {semiTypes.length === 0 && <p className="text-xs text-slate-500">No semi sets in Set Matrix for this variant.</p>}
          {semiGroups.map((group, index) => {
            const type = semiTypes.find((item) => item.key === group.semiKey);
            const remaining = type ? Math.max(0, type.quantity - semiUsedByOthers(index, group.semiKey)) : 0;
            return (
              <GroupCard key={index} onRemove={() => emit({ semiSets: semiGroups.filter((_, position) => position !== index) })}>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-2">
                    <span className="font-medium text-slate-600">Semi set</span>
                    <select
                      value={group.semiKey}
                      onChange={(event) => updateSemiGroup(index, { semiKey: event.target.value, sizeIds: [], count: 1 })}
                      className="h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                    >
                      {semiTypes.map((item) => (
                        <option key={item.key} value={item.key}>{labelsOf(item.sizes, item.sizes.map((size) => size.id))} ({item.quantity} received)</option>
                      ))}
                    </select>
                  </label>
                  <span className="font-medium text-slate-600">Number</span>
                  <Stepper value={group.count} min={1} max={Math.max(1, remaining)} onChange={(count) => updateSemiGroup(index, { count })} label="Number of semi sets" />
                </div>
                {type && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-600">Defective sizes in each semi set</span>
                    <SizeChips sizes={type.sizes} selected={group.sizeIds} onToggle={(sizeId) => toggleSemiSize(index, sizeId)} />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <CategorySelect value={group.category} onChange={(category) => updateSemiGroup(index, { category })} />
                  <KeepOrReturn keep={group.keep} onChange={(keep) => updateSemiGroup(index, { keep })} />
                </div>
              </GroupCard>
            );
          })}
          <button
            type="button"
            disabled={semiTypes.length === 0}
            onClick={() => emit({ semiSets: [...semiGroups, { semiKey: semiTypes[0].key, count: 1, sizeIds: [], category: "", keep: true }] })}
            className="text-xs font-semibold text-emerald-700 hover:underline disabled:text-slate-400"
          >
            + Add semi sets
          </button>
        </section>
      )}

      {/* Loose pieces */}
      {openSources.LOOSE && (
        <section className="mb-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-800">Loose pieces</h4>
          {looseRows.length === 0 && <p className="text-xs text-slate-500">No loose pieces for this variant.</p>}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {looseRows.map((row) => {
              const entry = looseEntry(row.id);
              const count = entry?.quantity ?? 0;
              const keep = entry?.keep ?? true;
              return (
                <div key={row.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{row.sizeLabel}</span>
                    <span className="text-slate-500">{row.quantity} loose</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-600">Defective</span>
                    <Stepper value={count} max={row.quantity} onChange={(quantity) => setLoose(row.id, { quantity })} label={`Defective ${row.sizeLabel}`} />
                  </div>
                  {count > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      <CategorySelect value={entry?.category ?? ""} onChange={(category) => setLoose(row.id, { category })} />
                      <KeepOrReturn keep={keep} onChange={(next) => setLoose(row.id, { keep: next })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* After defects */}
      <div className="space-y-1.5 rounded-lg bg-emerald-50/60 p-3 text-xs text-slate-700">
        <p className="font-bold text-slate-800">After defects</p>
        <p>Full sets: <strong>{breakdown.sets}</strong></p>
        {breakdown.semiSets.length > 0 && (
          <p>
            Semi sets:{" "}
            <strong>
              {breakdown.semiSets.map((semiSet) => `${labelsOf(setSizes, semiSet.sizeIds)} ×${semiSet.quantity}`).join(", ")}
            </strong>
          </p>
        )}
        {Object.values(breakdown.loose).some((quantity) => quantity > 0) && (
          <p>
            Loose:{" "}
            <strong>
              {Object.entries(breakdown.loose)
                .filter(([, quantity]) => quantity > 0)
                .map(([sizeId, quantity]) => `${labelFor(sizes, sizeId)} ×${quantity}`)
                .join(", ")}
            </strong>
          </p>
        )}
        {breakdown.newSemiSets.map((semiSet) => (
          <p key={semiSet.sizeIds.join("-")} className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-amber-900">
            New semi set <strong>{labelsOf(sizes, semiSet.sizeIds)}</strong> ×{semiSet.quantity} is created automatically, from the sets that broke.
          </p>
        ))}
        {breakdown.errors.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-red-600">
            {breakdown.errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
        {error && <p className="mt-2 font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
};

const QcDefectStep = ({
  selectedVariants,
  variantTotals,
  configs,
  breakdownByKey,
  groupsByKey = EMPTY_GROUPS,
  onGroupsChange,
  qcRemarks,
  onQcRemarksChange,
  errors,
}) => {
  const totalReceived = Object.values(variantTotals).reduce((sum, item) => sum + item.garmentsTotal, 0);
  const totalDefects = Object.values(breakdownByKey).reduce((sum, item) => sum + item.defectiveCount, 0);
  const totalReturned = Object.values(breakdownByKey).reduce((sum, item) => sum + item.returnedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Inspection &amp; Defect Routing</h3>
          <p className="text-xs text-slate-500">
            Mark each defect, then choose for each one whether it is kept in stock (factory seconds) or returned to the jobber. A set with a defective piece is re-sorted either way.
          </p>
        </div>
        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Total Received: <span className="text-emerald-600">{totalReceived} Pcs</span>
        </span>
      </div>

      <div className="space-y-4">
        {selectedVariants.map((variant) => {
          const key = getVariantKey(variant);
          const totals = variantTotals[key];
          const config = configs[key];
          const breakdown = breakdownByKey[key];
          if (!totals || !config || !breakdown) return null;

          return (
            <VariantQcCard
              key={key}
              variant={variant}
              totals={totals}
              config={config}
              breakdown={breakdown}
              groups={groupsByKey[key] ?? {}}
              onGroupsChange={(groups) => onGroupsChange(key, groups)}
              error={errors[key]}
            />
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-bold uppercase tracking-wider text-slate-700">Defects in this inward</p>
        <p>{totalDefects} defective pcs: {totalDefects - totalReturned} kept in stock, {totalReturned} returned to the jobber.</p>
        <p>Returned pieces are not added to stock. Kept pieces are added to stock as loose pieces of their size, like fresh stock.</p>

        <div className="pt-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">QC Inspection Remarks</label>
          <Textarea
            rows={2}
            placeholder="e.g. 2 pieces returned for re-stitching due to oil spot on back pleat."
            value={qcRemarks}
            onChange={(event) => onQcRemarksChange(event.target.value)}
            className="rounded-lg border-slate-200 bg-white text-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10"
          />
        </div>
      </div>
    </div>
  );
};

export default QcDefectStep;

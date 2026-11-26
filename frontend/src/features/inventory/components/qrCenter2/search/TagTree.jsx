import { useState } from "react";
import { ChevronDown, Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState, LIST_SCROLL, ListBox } from "../shared/primitives.jsx";
import QrCodeImage from "../../qr-center/QrCodeImage.jsx";

// One tri-state checkbox: unchecked, some of its tags picked (mixed), or all of them picked.
const PickBox = ({ state, onChange, label }) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={state === "mixed" ? "mixed" : state === "all"}
        aria-label={label}
        onClick={(event) => {
            event.stopPropagation();
            onChange();
        }}
        className={cn(
            "grid size-5 flex-none place-items-center rounded-[5px] border-[1.5px]",
            state === "none" ? "border-slate-300 bg-white" : "border-emerald-600 bg-emerald-600 text-white",
        )}
    >
        {state === "all" && <Check className="size-3" strokeWidth={3} />}
        {state === "mixed" && <Minus className="size-3" strokeWidth={3} />}
    </button>
);

const KIND_STYLE = {
    SET: { label: "SET", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    SEMI: { label: "SEMI", className: "border-violet-200 bg-violet-50 text-violet-700" },
    LSE: { label: "LSE", className: "border-amber-200 bg-amber-50 text-amber-700" },
    PIECE: { label: "PIECE", className: "border-slate-200 bg-slate-50 text-slate-600" },
};

const kindOf = (item, { child = false } = {}) => (item.isSemi ? "SEMI" : item.type === "SET" || item.type === "BUNDLE" ? "SET" : child ? "PIECE" : "LSE");

const KindTag = ({ kind }) => (
    <span className={cn("flex-none rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide", KIND_STYLE[kind].className)}>
        {KIND_STYLE[kind].label}
    </span>
);

const meta = (item) =>
    [item.design.code, item.variant.colorName, item.sizeLabel ? `size ${item.sizeLabel}` : null, item.challanNo ? `challan ${item.challanNo}` : null]
        .filter(Boolean)
        .join(" · ");

// The reprint picker: sets (their pieces listed under each one), then semi sets, then loose pieces.
// Picking a set picks all its pieces; picking a piece on its own leaves its set mixed.
export default function TagTree({ data, loading, hasQuery, selectedIds, onPick, onOpen }) {
    const [expanded, setExpanded] = useState({});

    if (!hasQuery) {
        return (
            <ListBox className="mt-4">
                <EmptyState title="Search or filter to begin">
                    Type a challan number, a QR or readable ID (e.g. SET-KP100-MID-007), or a design code. The sets, semi sets and loose pieces that match are listed here in serial order.
                </EmptyState>
            </ListBox>
        );
    }
    if (loading && !data) {
        return <ListBox className="mt-4"><EmptyState>Searching…</EmptyState></ListBox>;
    }

    const groups = [
        { key: "sets", title: "Sets", items: data?.sets ?? [] },
        { key: "semi", title: "Semi sets", items: data?.semiSets ?? [] },
        { key: "loose", title: "Loose pieces", items: data?.loose ?? [] },
    ];
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    if (total === 0) {
        return (
            <ListBox className="mt-4">
                <EmptyState title="No tag matches">Check the code, or widen the filters.</EmptyState>
            </ListBox>
        );
    }

    // Every tag a row stands for: a set stands for itself and its pieces.
    const tagsOf = (item) => [item, ...(item.children ?? [])];
    const stateOf = (tags) => {
        const picked = tags.filter((tag) => selectedIds.has(tag.stockItemQrId)).length;
        return picked === 0 ? "none" : picked === tags.length ? "all" : "mixed";
    };
    const pick = (tags, state) => onPick(tags, state !== "all");

    return (
        <div className={cn("mt-4 space-y-3", LIST_SCROLL)}>
            {groups.filter((group) => group.items.length > 0).map((group) => {
                const allTags = group.items.flatMap(tagsOf);
                const groupState = stateOf(allTags);
                return (
                    <ListBox key={group.key}>
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
                            <PickBox state={groupState} onChange={() => pick(allTags, groupState)} label={`Select all ${group.title.toLowerCase()}`} />
                            <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-slate-500">
                                {group.title} · {group.items.length}
                            </span>
                            <span className="ml-auto font-mono text-[11.5px] text-slate-400">
                                {allTags.filter((tag) => selectedIds.has(tag.stockItemQrId)).length} of {allTags.length} picked
                            </span>
                        </div>

                        {group.items.map((item) => {
                            const tags = tagsOf(item);
                            const state = stateOf(tags);
                            const hasChildren = (item.children ?? []).length > 0;
                            const isOpen = Boolean(expanded[item.stockItemQrId]);
                            return (
                                <div key={item.stockItemQrId} className="border-b border-slate-100 last:border-b-0">
                                    <div className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 sm:px-4">
                                        <PickBox state={state} onChange={() => pick(tags, state)} label={`Select ${item.displayCode ?? item.shortCode}`} />
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                aria-label={isOpen ? "Hide pieces" : "Show pieces"}
                                                aria-expanded={isOpen}
                                                onClick={() => setExpanded((current) => ({ ...current, [item.stockItemQrId]: !isOpen }))}
                                                className="grid size-6 flex-none place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                                            </button>
                                        ) : (
                                            <span className="w-6 flex-none" />
                                        )}
                                        <button type="button" onClick={() => onOpen(item.shortCode)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                            <span className="theme-light flex-none rounded-md border border-slate-200 bg-white p-[3px] leading-none">
                                                <QrCodeImage value={item.shortCode} size={30} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-mono text-[13px] font-semibold text-slate-900 [overflow-wrap:anywhere]">{item.displayCode ?? item.shortCode}</span>
                                                <span className="block truncate text-[12px] text-slate-500">
                                                    {meta(item)}
                                                    {hasChildren ? ` · ${item.children.length} piece${item.children.length === 1 ? "" : "s"}` : ""}
                                                </span>
                                            </span>
                                        </button>
                                        <KindTag kind={kindOf(item)} />
                                    </div>

                                    {isOpen &&
                                        item.children.map((child) => {
                                            const picked = selectedIds.has(child.stockItemQrId);
                                            return (
                                                <div key={child.stockItemQrId} className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/70 py-2 pl-14 pr-3.5 sm:pr-4">
                                                    <PickBox
                                                        state={picked ? "all" : "none"}
                                                        onChange={() => onPick([child], !picked)}
                                                        label={`Select ${child.displayCode ?? child.shortCode}`}
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-mono text-[12.5px] text-slate-800 [overflow-wrap:anywhere]">{child.displayCode ?? child.shortCode}</span>
                                                        <span className="block truncate text-[11.5px] text-slate-500">{child.sizeLabel ? `size ${child.sizeLabel}` : "piece"}</span>
                                                    </span>
                                                    <KindTag kind={kindOf(child, { child: true })} />
                                                </div>
                                            );
                                        })}
                                </div>
                            );
                        })}
                    </ListBox>
                );
            })}
        </div>
    );
}

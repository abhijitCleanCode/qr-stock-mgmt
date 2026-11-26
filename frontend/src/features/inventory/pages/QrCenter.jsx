import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import QrCenterHeader from "../components/qrCenter2/QrCenterHeader.jsx";
import { Sheet } from "../components/qrCenter2/shared/primitives.jsx";
import SearchBar from "../components/qrCenter2/search/SearchBar.jsx";
import FilterBar from "../components/qrCenter2/search/FilterBar.jsx";
import ChallanPicker from "../components/qrCenter2/search/ChallanPicker.jsx";
import TagTree from "../components/qrCenter2/search/TagTree.jsx";
import TagDetail from "../components/qrCenter2/search/TagDetail.jsx";
import HistorySection from "../components/qrCenter2/history/HistorySection.jsx";
import ReprintDrawer, { RAISED_BY } from "../components/qrCenter2/drawer/ReprintDrawer.jsx";
import ReprintReasonDialog from "../components/qrCenter2/drawer/ReprintReasonDialog.jsx";
import BatchStudioDrawer from "../components/qrCenter2/drawer/BatchStudioDrawer.jsx";
import { useQrCenterTreeApi } from "../hooks/useQrCenterTreeApi.js";
import { useQrCenterChallansApi } from "../hooks/useQrCenterChallansApi.js";
import { useQrCenterResolveApi } from "../hooks/useQrCenterResolveApi.js";
import { useDesignListApi } from "../../design/hooks/useDesignListApi.js";
import { createQrCenterReprintApi } from "../services/qrCenter.api.js";
import { formatDateOnly } from "../utils/stockHistoryLabels";

const EMPTY_FILTERS = { designId: "", colorVariantId: "", type: "", days: "" };

const QrCenter = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    // Set by "View QR tags" on a Stock In challan: narrows the history below to that challan.
    const challanNo = searchParams.get("challan") ?? "";
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [selectedCode, setSelectedCode] = useState(null);
    // Step one of the reprint picker: the challan chosen from the search results (one at a time).
    const [challan, setChallan] = useState(null);
    const [reprintTargets, setReprintTargets] = useState(null);
    // Tags picked in the list, by stock item QR id. Each one keeps the fields the studio needs.
    const [picked, setPicked] = useState(() => new Map());
    const [reasonOpen, setReasonOpen] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    // The Configure & print studio. `session` changes on every open so the studio starts clean.
    // `qrIds` narrows it to a picked selection (a reprint) instead of the whole batch.
    const [studio, setStudio] = useState({ open: false, batchId: null, qrIds: null, session: 0 });

    const { data: designsResponse } = useDesignListApi({ limit: 100 });
    const designs = designsResponse?.data ?? [];

    const hasQuery = Boolean(query || filters.designId || filters.colorVariantId || filters.type || filters.days);
    const { data: challansResponse, isFetching: isSearchingChallans } = useQrCenterChallansApi(
        { keyword: query, ...filters },
        { enabled: hasQuery && !challan && !selectedCode },
    );
    const { data: treeResponse, isFetching: isLoadingTree } = useQrCenterTreeApi(
        { challanId: challan?.challanId },
        { enabled: Boolean(challan) && !selectedCode },
    );
    const challans = challansResponse?.data;
    const { data: resolveResponse } = useQrCenterResolveApi(selectedCode);

    const handleSelectResult = (code) => setSelectedCode(code);
    const handleBackFromDetail = (nextCode) => setSelectedCode(nextCode ?? null);

    // A new search or new filters start the picker over. Choosing a different challan clears the picks.
    const changeSearch = (patch) => {
        setSelectedCode(null);
        setChallan(null);
        setPicked(new Map());
        if (patch.query !== undefined) setQuery(patch.query);
        if (patch.filters !== undefined) setFilters(patch.filters);
    };
    const chooseChallan = (next) => {
        setPicked(new Map());
        setChallan(next);
    };

    // Picking a set passes its pieces too; `checked` false removes them.
    const handlePick = (tags, checked) =>
        setPicked((current) => {
            const next = new Map(current);
            tags.forEach((tag) => (checked ? next.set(tag.stockItemQrId, tag) : next.delete(tag.stockItemQrId)));
            return next;
        });

    const pickedTags = [...picked.values()];

    // Step 1 of a reprint: the picked tags are all from the chosen challan, which the studio prints as one batch.
    const startReprint = () => {
        if (pickedTags.length === 0) return;
        setReasonOpen(true);
    };

    // Step 2: log the reason on every picked tag, then open the Configure & print studio with them.
    const confirmReprint = async (reasonCode) => {
        setIsLogging(true);
        try {
            for (const tag of pickedTags) {
                await createQrCenterReprintApi({ stockItemId: tag.stockItemId, reasonCode, raisedBy: RAISED_BY });
            }
            const batchId = `c${challan.challanId}`;
            const qrIds = pickedTags.map((tag) => tag.stockItemQrId);
            setStudio((prev) => ({ open: true, batchId, qrIds, session: prev.session + 1 }));
            setReasonOpen(false);
            setPicked(new Map());
            await queryClient.invalidateQueries({ queryKey: ["qr-center"] });
        } catch (error) {
            toast.error(error?.message ?? "Couldn't log the reprint reason.");
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3.5 pb-10 text-sm text-slate-900 sm:gap-5 sm:pb-16">
            <QrCenterHeader />

            <Sheet>
                <SearchBar
                    value={query}
                    onChange={(v) => changeSearch({ query: v })}
                    placeholder="Search by challan no., set ID, piece ID or design code"
                />
                <FilterBar
                    designs={designs}
                    filters={filters}
                    onChange={(f) => changeSearch({ filters: f })}
                    onClear={() => changeSearch({ filters: EMPTY_FILTERS })}
                    resultCount={challans?.length ?? 0}
                    showCount={hasQuery && !selectedCode}
                    searchKeyword={query}
                />

                {selectedCode ? (
                    <TagDetail
                        result={resolveResponse?.data}
                        onBack={handleBackFromDetail}
                        onRaiseReprint={(targets) => setReprintTargets(targets)}
                    />
                ) : !challan ? (
                    <ChallanPicker challans={challans} loading={isSearchingChallans} hasQuery={hasQuery} onSelect={chooseChallan} />
                ) : (
                    <>
                        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <button type="button" onClick={() => changeSearch({})} className="text-[13px] font-semibold text-emerald-700 hover:underline">
                                ← All challans
                            </button>
                            <span className="font-mono text-[13.5px] font-bold text-slate-900">Challan {challan.challanNo}</span>
                            <span className="text-[13px] text-slate-500">
                                {challan.jobberName ?? "—"} · {formatDateOnly(challan.stockDate)}
                            </span>
                        </div>
                        <TagTree
                            data={treeResponse?.data}
                            loading={isLoadingTree}
                            hasQuery
                            selectedIds={new Set(picked.keys())}
                            onPick={handlePick}
                            onOpen={handleSelectResult}
                        />

                        {picked.size > 0 && (
                            <div className="sticky bottom-3 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-white px-4 py-3 shadow-lg">
                                <span className="text-[13.5px] text-slate-700">
                                    <b className="font-mono text-slate-900">{picked.size}</b> tag{picked.size === 1 ? "" : "s"} picked
                                </span>
                                <button type="button" onClick={() => setPicked(new Map())} className="px-1 text-[13px] text-slate-500 hover:text-slate-900">
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={startReprint}
                                    className="ml-auto h-10 rounded-lg bg-emerald-600 px-4 text-[13.5px] font-semibold text-white hover:bg-emerald-700"
                                >
                                    Reprint {picked.size} tag{picked.size === 1 ? "" : "s"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Sheet>

            <HistorySection
                designs={designs}
                challanNo={challanNo}
                onClearChallan={() => setSearchParams({}, { replace: true })}
                onOpen={(row) => setStudio((prev) => ({ open: true, batchId: row.batchId, qrIds: null, session: prev.session + 1 }))}
            />

            <ReprintDrawer
                open={Boolean(reprintTargets)}
                onClose={() => setReprintTargets(null)}
                targets={reprintTargets}
                onDone={() => setSelectedCode(null)}
            />
            {reasonOpen && (
                <ReprintReasonDialog
                    count={picked.size}
                    submitting={isLogging}
                    onCancel={() => setReasonOpen(false)}
                    onConfirm={confirmReprint}
                />
            )}
            <BatchStudioDrawer
                open={studio.open}
                batchId={studio.batchId}
                qrIds={studio.qrIds}
                sessionKey={studio.session}
                onClose={() => setStudio((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default QrCenter;

import { useState } from "react";
import { useNavigate } from "react-router";

import "../qrCenter2.theme.css";
import QrCenterHeader from "../components/qrCenter2/QrCenterHeader.jsx";
import SearchBar from "../components/qrCenter2/search/SearchBar.jsx";
import FilterBar from "../components/qrCenter2/search/FilterBar.jsx";
import ResultList from "../components/qrCenter2/search/ResultList.jsx";
import TagDetail from "../components/qrCenter2/search/TagDetail.jsx";
import HistorySection from "../components/qrCenter2/history/HistorySection.jsx";
import ReprintDrawer from "../components/qrCenter2/drawer/ReprintDrawer.jsx";
import ConfigureBatchDrawer from "../components/qrCenter2/drawer/ConfigureBatchDrawer.jsx";
import { useQrCenterSearchApi } from "../hooks/useQrCenterSearchApi.js";
import { useQrCenterResolveApi } from "../hooks/useQrCenterResolveApi.js";
import { useDesignListApi } from "../../design/hooks/useDesignListApi.js";

const EMPTY_FILTERS = { designId: "", colorVariantId: "", type: "", days: "" };

const QrCenter = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [selectedCode, setSelectedCode] = useState(null);
    const [reprintTargets, setReprintTargets] = useState(null);
    const [configureBatchId, setConfigureBatchId] = useState(null);

    const { data: designsResponse } = useDesignListApi({ limit: 200 });
    const designs = designsResponse?.data ?? [];

    const hasQuery = Boolean(query || filters.designId || filters.colorVariantId || filters.type || filters.days);
    const { data: searchResponse, isFetching } = useQrCenterSearchApi(
        { keyword: query, ...filters, limit: 30 },
        { enabled: hasQuery && !selectedCode },
    );
    const { data: resolveResponse } = useQrCenterResolveApi(selectedCode);

    const handleSelectResult = (code) => setSelectedCode(code);
    const handleBackFromDetail = (nextCode) => setSelectedCode(nextCode ?? null);

    return (
        <div className="qrc2-scope">
            <QrCenterHeader />

            <div className="qrc2-sheet">
                <SearchBar
                    value={query}
                    onChange={(v) => { setQuery(v); setSelectedCode(null); }}
                    placeholder="Search by set ID, piece ID, design code or challan no."
                />
                <FilterBar
                    designs={designs}
                    filters={filters}
                    onChange={(f) => { setFilters(f); setSelectedCode(null); }}
                    onClear={() => setFilters(EMPTY_FILTERS)}
                    resultCount={searchResponse?.meta?.total ?? 0}
                    showCount={hasQuery && !selectedCode}
                />

                {selectedCode ? (
                    <TagDetail
                        result={resolveResponse?.data}
                        onBack={handleBackFromDetail}
                        onRaiseReprint={(targets) => setReprintTargets(targets)}
                    />
                ) : (
                    <ResultList
                        tags={searchResponse?.data ?? []}
                        onSelect={handleSelectResult}
                        loading={isFetching}
                        hasQuery={hasQuery}
                    />
                )}
            </div>

            <HistorySection
                designs={designs}
                onConfigure={(row) => setConfigureBatchId(row.registrationId)}
                onView={(row) => navigate(`/qr-center/${row.registrationId}`)}
            />

            <ReprintDrawer
                open={Boolean(reprintTargets)}
                onClose={() => setReprintTargets(null)}
                targets={reprintTargets}
                onDone={() => setSelectedCode(null)}
            />
            <ConfigureBatchDrawer
                open={Boolean(configureBatchId)}
                onClose={() => setConfigureBatchId(null)}
                stockInTransactionId={configureBatchId}
                onDone={() => setConfigureBatchId(null)}
            />
        </div>
    );
};

export default QrCenter;

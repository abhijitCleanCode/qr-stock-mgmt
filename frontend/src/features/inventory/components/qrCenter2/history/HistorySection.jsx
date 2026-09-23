import { useState } from "react";
import { useQrCenterListApi } from "../../../hooks/useQrCenterListApi.js";
import HistoryFilterBar from "./HistoryFilterBar.jsx";
import HistoryRow from "./HistoryRow.jsx";

const EMPTY_FILTERS = { designId: "", colorVariantId: "", sort: "new" };

export default function HistorySection({ designs, onConfigure, onView }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [statusFilter, setStatusFilter] = useState("all");
    const { data: response, isLoading } = useQrCenterListApi({ ...filters, limit: 50 });
    const allRows = response?.data ?? [];
    const rows = statusFilter === "all" ? allRows : allRows.filter((r) => r.printStatus === statusFilter);

    return (
        <div className="qrc2-sheet">
            <div>
                <h2 className="qrc2-sec">Stock-in history</h2>
                <p className="qrc2-sec-sub">Every inward batch and what was printed for it. A batch whose tags were skipped can be configured and printed here at any time — the stock is already registered, only the labels are missing.</p>
            </div>

            <HistoryFilterBar
                designs={designs}
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(EMPTY_FILTERS)}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                resultCount={rows.length}
            />

            <div className="qrc2-hwrap">
                {isLoading && <div className="qrc2-empty" style={{ padding: 34 }}>Loading…</div>}
                {!isLoading && rows.length === 0 && (
                    <div className="qrc2-empty" style={{ padding: 34 }}>
                        <b>No batches match</b>
                        Try a different filter, or clear them to see the full history.
                    </div>
                )}
                {rows.map((row) => (
                    <HistoryRow key={`${row.registrationType}-${row.registrationId}`} row={row} onConfigure={onConfigure} onView={onView} />
                ))}
            </div>
        </div>
    );
}

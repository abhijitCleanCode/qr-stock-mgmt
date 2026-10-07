import { useState } from "react";
import { useQrCenterListApi } from "../../../hooks/useQrCenterListApi.js";
import HistoryFilterBar from "./HistoryFilterBar.jsx";
import HistoryRow from "./HistoryRow.jsx";
import { EmptyState, ListBox, Sheet } from "../shared/primitives.jsx";

const EMPTY_FILTERS = { designId: "", colorVariantId: "", sort: "new" };

export default function HistorySection({ designs, onConfigure, onView }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [statusFilter, setStatusFilter] = useState("all");
    const { data: response, isLoading } = useQrCenterListApi({ ...filters, limit: 50 });
    const allRows = response?.data ?? [];
    const rows = statusFilter === "all" ? allRows : allRows.filter((r) => r.printStatus === statusFilter);

    return (
        <Sheet>
            <div>
                <h2 className="mb-1 text-[16.5px] font-bold tracking-[-.005em]">Stock-in history</h2>
                <p className="mb-4 max-w-[86ch] text-[13.5px] text-slate-500">Every inward batch and what was printed for it. A batch whose tags were skipped can be configured and printed here at any time — the stock is already registered, only the labels are missing.</p>
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

            <ListBox className="mt-4">
                {isLoading && <EmptyState>Loading…</EmptyState>}
                {!isLoading && rows.length === 0 && (
                    <EmptyState title="No batches match">
                        Try a different filter, or clear them to see the full history.
                    </EmptyState>
                )}
                {rows.map((row) => (
                    <HistoryRow key={`${row.registrationType}-${row.registrationId}`} row={row} onConfigure={onConfigure} onView={onView} />
                ))}
            </ListBox>
        </Sheet>
    );
}

import { useEffect, useRef, useState } from "react";
import { useQrCenterListApi } from "../../../hooks/useQrCenterListApi.js";
import HistoryFilterBar from "./HistoryFilterBar.jsx";
import HistoryRow from "./HistoryRow.jsx";

const EMPTY_FILTERS = { designId: "", colorVariantId: "", sort: "new" };

export default function HistorySection({ designs, onConfigure, onView, challanNo = "", onClearChallan }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [statusFilter, setStatusFilter] = useState("all");
    const sectionRef = useRef(null);
    // The list API's keyword is a substring match (and needs 2+ chars); rows are then narrowed
    // to the exact challan so "DC-1" doesn't also show "DC-10".
    const { data: response, isLoading } = useQrCenterListApi({
        ...filters,
        keyword: challanNo.length >= 2 ? challanNo : undefined,
        limit: 50,
    });
    const allRows = (response?.data ?? []).filter((r) => !challanNo || r.challanNo === challanNo);
    const rows = statusFilter === "all" ? allRows : allRows.filter((r) => r.printStatus === statusFilter);

    useEffect(() => {
        if (challanNo) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [challanNo]);

    return (
        <div className="qrc2-sheet" ref={sectionRef}>
            <div>
                <h2 className="qrc2-sec">Stock-in history</h2>
                <p className="qrc2-sec-sub">Every inward batch and what was printed for it. A batch whose tags were skipped can be configured and printed here at any time — the stock is already registered, only the labels are missing.</p>
            </div>

            {challanNo && (
                <div className="qrc2-sec-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span>Showing tags for challan <b>{challanNo}</b></span>
                    <button className="qrc2-fclear" onClick={onClearChallan}>Show all batches</button>
                </div>
            )}

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

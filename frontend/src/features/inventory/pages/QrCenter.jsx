import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import DataTable from "@/components/shared/table/DataTable";
import TablePageLayout from "@/components/shared/layout/TablePageLayout";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQrCenterListApi } from "../hooks/useQrCenterListApi";
import { qrCenterColumns } from "../table/QrCenterColumns";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_KEYWORD_LENGTH = 2;
const PAGE_LIMIT = 20;

const QrCenter = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const keyword = trimmedQuery.length >= MIN_KEYWORD_LENGTH ? trimmedQuery : undefined;

  const { data: response, isPending } = useQrCenterListApi({ page, limit: PAGE_LIMIT, keyword });
  const registrations = response?.data ?? [];
  const meta = response?.meta;

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setPage(1);
  };

  return (
    <TablePageLayout className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">QR Center</h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] glass-table p-2 space-y-2">
        <div className="flex shrink-0 flex-col md:flex-row gap-4 justify-between items-center rounded-[22px] px-3 py-2.5">
          <div className="flex items-center flex-1 w-full relative neu-pressed">
            <Search className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by design code, name, or color..."
              className="bg-transparent border-none outline-none pl-12 pr-4 py-2 w-full text-sm placeholder:text-gray-500 font-medium"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-transparent">
          {isPending ? (
            <Loader2 className="animate-spin text-cyan-400" />
          ) : (
            <DataTable
              columns={qrCenterColumns}
              data={registrations}
              pageSize={PAGE_LIMIT}
              emptyState={
                keyword
                  ? { title: "No matching stock registrations found", description: `No stock registrations match "${keyword}".` }
                  : { title: "No stock registrations with QR codes", description: "Registrations will appear here once Stock In generates QR codes." }
              }
            />
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between px-3 py-1.5 text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} stock registration{meta.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </TablePageLayout>
  );
};

export default QrCenter;

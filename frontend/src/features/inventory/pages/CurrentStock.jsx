import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import DataTable from "@/components/shared/table/DataTable";
import TablePageLayout from "@/components/shared/layout/TablePageLayout";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCurrentStockApi } from "../hooks/useCurrentStockApi";
import { columns } from "../table/CurrentStockColumns";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_KEYWORD_LENGTH = 2;
const PAGE_LIMIT = 20;

const CurrentStock = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  // Mirrors the backend's own min-length rule (listCurrentStockQuerySchema) — below that,
  // just omit keyword entirely rather than sending a query the API would reject.
  const keyword = trimmedQuery.length >= MIN_KEYWORD_LENGTH ? trimmedQuery : undefined;

  const { data: response, isPending } = useCurrentStockApi({ page, limit: PAGE_LIMIT, keyword });
  const currentStock = response?.data ?? [];
  const meta = response?.meta;

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setPage(1); // a new search always starts back at page 1
  };

  return (
    <TablePageLayout className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E1B4B] tracking-tight">Current Stock</h1>
      </div>

      {/* Main glass container */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[24px] glass-table p-2 space-y-2">
        {/* Search */}
        <div className="flex shrink-0 flex-col md:flex-row gap-4 justify-between items-center rounded-[22px] px-3 py-2.5">
          <div className="flex items-center flex-1 w-full relative neu-pressed">
            <Search className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by design code or name..."
              className="bg-transparent border-none outline-none pl-12 pr-4 py-2 w-full text-sm placeholder:text-gray-500 font-medium"
            />
          </div>
        </div>

        {/* Table wrapper */}
        <div className="min-h-0 flex-1 bg-transparent">
          {isPending ? (
            <Loader2 className="animate-spin text-cyan-400" />
          ) : (
            <DataTable
              columns={columns}
              data={currentStock}
              pageSize={PAGE_LIMIT}
              emptyState={
                keyword
                  ? { title: "No matching stock found", description: `No designs match "${keyword}".` }
                  : { title: "No current stock", description: "No design variants to display yet." }
              }
            />
          )}
        </div>

        {/* Pagination — Design + Color Variant rows, per the API's page/limit/total/totalPages meta */}
        {meta && meta.totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between px-3 py-1.5 text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} variants
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

export default CurrentStock;

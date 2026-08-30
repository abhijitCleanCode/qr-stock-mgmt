import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Loader2, Search } from "lucide-react";
import { toast } from "react-toastify";

import DataTable from "@/components/shared/table/DataTable";
import TablePageLayout from "@/components/shared/layout/TablePageLayout";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQrCenterListApi } from "../hooks/useQrCenterListApi";
import { useGenerateQrCodesApi } from "../hooks/useGenerateQrCodesApi";
import { createQrCenterColumns } from "../table/QrCenterColumns";
import QrPrintSheet from "../components/qr-center/QrPrintSheet";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_KEYWORD_LENGTH = 2;
const PAGE_LIMIT = 20;

const QrCenter = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowSelection, setRowSelection] = useState({});
  const [printItems, setPrintItems] = useState([]);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const keyword = trimmedQuery.length >= MIN_KEYWORD_LENGTH ? trimmedQuery : undefined;

  const { data: response, isPending } = useQrCenterListApi({ page, limit: PAGE_LIMIT, keyword });
  const stockItems = response?.data ?? [];
  const meta = response?.meta;

  const generateQr = useGenerateQrCodesApi();

  // Printing needs the DOM committed before window.print() reads it — flushSync makes that
  // synchronous instead of racing a setState against the print call.
  const handlePrint = (items) => {
    flushSync(() => setPrintItems(items));
    window.print();
  };

  const columns = useMemo(() => createQrCenterColumns({ onPrintOne: (item) => handlePrint([item]) }), []);

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setPage(1);
    setRowSelection({}); // selection only ever refers to rows on the page currently shown
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setRowSelection({});
  };

  const selectedIds = Object.keys(rowSelection)
    .filter((id) => rowSelection[id])
    .map(Number);
  const selectedItems = stockItems.filter((item) => rowSelection[String(item.stockItemId)]);

  const handleBulkGenerate = () => {
    generateQr.mutate(selectedIds, {
      onSuccess: (result) => {
        const { generatedCount, alreadyExistedCount, skipped } = result.data;

        if (generatedCount > 0) {
          toast.success(`Generated ${generatedCount} QR code${generatedCount === 1 ? "" : "s"}.`);
        }
        if (alreadyExistedCount > 0) {
          toast.info(`${alreadyExistedCount} selected item${alreadyExistedCount === 1 ? "" : "s"} already had a QR.`);
        }
        if (skipped.length > 0) {
          toast.error(`${skipped.length} selected item${skipped.length === 1 ? "" : "s"} couldn't be generated.`);
        }

        setRowSelection({});
      },
      onError: (error) => {
        toast.error(error?.message ?? "Couldn't generate QR codes. Please try again.");
      },
    });
  };

  const handleBulkPrint = () => {
    const printable = selectedItems.filter((item) => item.qr);

    if (printable.length === 0) {
      toast.error("None of the selected items have a QR yet. Generate QR codes first.");
      return;
    }
    if (printable.length < selectedItems.length) {
      toast.info(`Printing ${printable.length} of ${selectedItems.length} selected — the rest don't have a QR yet.`);
    }

    handlePrint(printable);
  };

  return (
    <>
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

          {selectedIds.length > 0 && (
            <div className="flex shrink-0 flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm font-medium text-foreground">{selectedIds.length} selected</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleBulkPrint}>
                  Print Selected
                </Button>
                <Button type="button" size="sm" onClick={handleBulkGenerate} disabled={generateQr.isPending}>
                  {generateQr.isPending && <Loader2 className="size-4 animate-spin" />}
                  Generate QR Codes
                </Button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 bg-transparent">
            {isPending ? (
              <Loader2 className="animate-spin text-cyan-400" />
            ) : (
              <DataTable
                columns={columns}
                data={stockItems}
                pageSize={PAGE_LIMIT}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                getRowId={(row) => String(row.stockItemId)}
                emptyState={
                  keyword
                    ? { title: "No matching stock found", description: `No sets or bundles match "${keyword}".` }
                    : { title: "No QR-eligible stock", description: "Sets and bundles will appear here once they exist." }
                }
              />
            )}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between px-3 py-1.5 text-sm text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages} · {meta.total} items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(meta.totalPages, page + 1))}
                  disabled={page >= meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </TablePageLayout>

      <QrPrintSheet items={printItems} />
    </>
  );
};

export default QrCenter;

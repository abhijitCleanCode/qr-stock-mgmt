import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import {
    getCoreRowModel,
    getPaginationRowModel,
    useLegacyTable,
} from "@tanstack/react-table/legacy";
import DataTableEmpty from "./DataTableEmpty";

const DataTable = ({ columns, data, emptyState }) => {
    const table = useLegacyTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    return (
        <div className="h-full overflow-auto rounded-3xl border border-white/40 bg-white/20 backdrop-blur-xl">
            <Table className="border-separate border-spacing-y-2">
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-0 hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="px-6 py-5 text-sm font-semibold text-[#1E1B4B]">
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {table.getRowModel().rows.length ? (table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            className="border-0 bg-white/70 transition-all duration-200 hover:bg-white"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="px-6 py-5">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))
                    ) : (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={columns.length} className="h-24">
                                <DataTableEmpty title={emptyState?.title} description={emptyState?.description} />
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

export default DataTable

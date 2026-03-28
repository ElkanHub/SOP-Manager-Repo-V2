"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/cn"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  onRowClick?: (row: TData) => void
  pagination?: boolean
  pageSize?: number
  className?: string
  noDataMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  onRowClick,
  pagination = true,
  pageSize = 10,
  className,
  noDataMessage = "No data found."
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm", className)}>
        <div className="h-12 bg-muted/30 border-b border-border/40" />
        {Array.from({ length: pageSize }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-border/20 last:border-0"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4 w-full", className)}>
      <div className={cn("rounded-xl border border-border bg-card overflow-hidden shadow-md transition-all duration-300", isLoading && "opacity-70")}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort()
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none",
                          isSortable && "cursor-pointer hover:text-foreground transition-colors group/th"
                        )}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {isSortable && (
                            <ArrowUpDown className={cn(
                              "h-3.5 w-3.5 opacity-40 group-hover/th:opacity-100 transition-opacity",
                              header.column.getIsSorted() && "opacity-100 text-brand-teal"
                            )} />
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/20">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={cn(
                      "group transition-colors",
                      onRowClick && "cursor-pointer hover:bg-brand-teal/[0.02]",
                      !onRowClick && "hover:bg-muted/10 font-medium"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground italic text-sm"
                  >
                    {noDataMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 py-1 bg-muted/10 rounded-lg border border-border/20">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            Page <span className="text-foreground">{table.getState().pagination.pageIndex + 1}</span> of{" "}
            <span className="text-foreground">{table.getPageCount()}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 px-2 text-[10px] font-bold gap-1 bg-background shadow-sm disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 px-2 text-[10px] font-bold gap-1 bg-background shadow-sm disabled:opacity-30 transition-all font-medium"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 font-medium" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

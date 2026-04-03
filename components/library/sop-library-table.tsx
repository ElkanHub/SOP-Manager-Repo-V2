"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Lock, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { fetchSopPage } from "@/lib/queries/sops"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { DeptBadge } from "@/components/ui/dept-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils/cn"
import { useSopTabStore } from "@/store/sop-tabs"
import { SopRecord } from "@/types/app.types"

interface SopLibraryTableProps {
  userDepartment: string
  userRole: "manager" | "employee"
  isAdmin: boolean
  isQa: boolean
  statusFilter?: string
}

export function SopLibraryTable({
  userDepartment,
  userRole,
  isAdmin,
  isQa,
  statusFilter,
}: SopLibraryTableProps) {
  const router = useRouter()
  const { addTab } = useSopTabStore()
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  // Reset to page 0 when status filter changes
  useEffect(() => { setPage(0) }, [statusFilter])

  const queryKey = ["sops", page, userDepartment, userRole, isAdmin, isQa, statusFilter]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchSopPage({ page, department: userDepartment, role: userRole, isAdmin, isQa, statusFilter }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  // Prefetch next page
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["sops", page + 1, userDepartment, userRole, isAdmin, isQa, statusFilter],
      queryFn: () => fetchSopPage({ page: page + 1, department: userDepartment, role: userRole, isAdmin, isQa, statusFilter }),
    })
  }, [page, userDepartment, userRole, isAdmin, isQa, statusFilter, queryClient])

  const sops: SopRecord[] = (result?.data as SopRecord[]) ?? []
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 25
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const columns: ColumnDef<SopRecord>[] = useMemo(
    () => [
      {
        accessorKey: "sop_number",
        header: "SOP No.",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.getValue("sop_number")}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => {
          const isLocked = row.original.locked
          return (
            <div className="flex items-center gap-2">
              <span className={cn("truncate", isLocked && "text-muted-foreground")}>
                {row.getValue("title")}
              </span>
              {isLocked && <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
            </div>
          )
        },
        size: 200,
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => {
          const dept = row.getValue("department") as string
          return <DeptBadge department={dept} colour="blue" />
        },
        size: 140,
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.getValue("version")}
          </span>
        ),
        size: 80,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.getValue("status") as string} size="sm" />
        ),
        size: 140,
      },
      {
        accessorKey: "date_listed",
        header: "Date Listed",
        cell: ({ row }) => {
          const date = row.getValue("date_listed") as string | null
          return date ? (
            <span className="text-xs text-slate-500">
              {format(new Date(date), "dd MMM yyyy")}
            </span>
          ) : null
        },
        size: 120,
      },
      {
        accessorKey: "due_for_revision",
        header: "Due Revision",
        cell: ({ row }) => {
          const date = row.getValue("due_for_revision") as string | null
          if (!date) return null
          const dueDate = new Date(date)
          const today = new Date()
          const isOverdue = dueDate < today
          const isDueSoon = !isOverdue && dueDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000
          return (
            <span className={cn(
              "text-xs",
              isOverdue && "text-red-600 dark:text-red-400 font-semibold",
              isDueSoon && "text-amber-600 dark:text-amber-400 font-semibold",
              !isOverdue && !isDueSoon && "text-muted-foreground"
            )}>
              {format(dueDate, "dd MMM yyyy")}
            </span>
          )
        },
        size: 130,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const sop = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { addTab({ id: sop.id, sopNumber: sop.sop_number, title: sop.title }); router.push(`/library/${sop.id}`) }}>
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem>Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                {userRole === "manager" && (
                  <DropdownMenuItem disabled={sop.locked}>
                    Submit Edit
                    {sop.locked && (
                      <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Locked</span>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>Copy SOP Number</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 48,
      },
    ],
    [addTab, router, userRole]
  )

  const table = useReactTable({
    data: sops,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading && !result) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="h-10 bg-muted border-b border-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border border-border bg-card overflow-hidden shadow-md transition-opacity", isFetching && "opacity-70")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold",
                        header.id === "sop_number" && "hidden md:table-cell",
                        header.id === "date_listed" && "hidden lg:table-cell",
                        header.id === "due_for_revision" && "hidden lg:table-cell",
                        header.id === "version" && "hidden sm:table-cell"
                      )}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => { const sop = row.original; addTab({ id: sop.id, sopNumber: sop.sop_number, title: sop.title }); router.push(`/library/${sop.id}`) }}
                  className={cn(
                    "cursor-pointer border-b border-border/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group",
                    index % 2 === 1 && "bg-slate-50/50 dark:bg-slate-800/20"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3",
                        cell.column.id === "sop_number" && "hidden md:table-cell",
                        cell.column.id === "date_listed" && "hidden lg:table-cell",
                        cell.column.id === "due_for_revision" && "hidden lg:table-cell",
                        cell.column.id === "version" && "hidden sm:table-cell"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {sops.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-sm text-muted-foreground">
                    No SOPs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} &middot; {totalCount} SOPs
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1 || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

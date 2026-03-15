"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Lock, MoreHorizontal, History } from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"
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
  sops: SopRecord[]
  userDepartment: string
  userRole: "manager" | "employee"
  isLoading?: boolean
}

export function SopLibraryTable({
  sops,
  userDepartment,
  userRole,
  isLoading,
}: SopLibraryTableProps) {
  const router = useRouter()
  const { addTab } = useSopTabStore()
  const [sorting, setSorting] = useState<SortingState>([])

  const isQa = userDepartment === "QA"

  const getDeptColour = (sop: SopRecord) => {
    return "blue"
  }

  const columns: ColumnDef<SopRecord>[] = useMemo(
    () => [
      {
        accessorKey: "sop_number",
        header: "SOP No.",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500">
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
              <span
                className={cn(
                  "truncate",
                  isLocked && "text-slate-400"
                )}
              >
                {row.getValue("title")}
              </span>
              {isLocked && (
                <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              )}
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
          return <DeptBadge department={dept} colour={getDeptColour(row.original)} />
        },
        size: 140,
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500">
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
          const isDueSoon =
            !isOverdue &&
            dueDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000

          return (
            <span
              className={cn(
                "text-xs",
                isOverdue && "text-red-600 font-semibold",
                isDueSoon && "text-amber-600 font-semibold",
                !isOverdue && !isDueSoon && "text-slate-500"
              )}
            >
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
              <DropdownMenuTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    addTab({
                      id: sop.id,
                      sopNumber: sop.sop_number,
                      title: sop.title,
                    })
                    router.push(`/library/${sop.id}`)
                  }}
                >
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem>Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                {userRole === "manager" && !sop.locked && (
                  <DropdownMenuItem>Submit Edit</DropdownMenuItem>
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
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="h-10 bg-slate-50 border-b border-slate-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-slate-100"
          >
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
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              onClick={() => {
                const sop = row.original
                addTab({
                  id: sop.id,
                  sopNumber: sop.sop_number,
                  title: sop.title,
                })
                router.push(`/library/${sop.id}`)
              }}
              className={cn(
                "cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/30",
                index % 2 === 1 && "bg-slate-50/50"
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

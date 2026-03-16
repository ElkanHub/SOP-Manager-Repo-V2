"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Lock, Wrench } from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Equipment, Profile, Department } from "@/types/app.types"
import { DeptBadge } from "@/components/ui/dept-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

interface EquipmentTableProps {
  equipment: Equipment[]
  userDepartment: string
  userRole: "manager" | "employee"
}

export function EquipmentTable({ equipment, userDepartment, userRole }: EquipmentTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<Equipment>[] = useMemo(
    () => [
      {
        accessorKey: "asset_id",
        header: "Asset ID",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue("asset_id")}</span>
        ),
        size: 120,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.getValue("status")} />
        ),
        size: 120,
      },
      {
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => {
          const freq = row.getValue("frequency") as string | null
          return freq ? (
            <span className="capitalize">{freq}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
        size: 100,
      },
      {
        accessorKey: "last_serviced",
        header: "Last Serviced",
        cell: ({ row }) => {
          const date = row.getValue("last_serviced") as string | null
          return date ? (
            <span className="text-sm">{format(new Date(date), "dd MMM yyyy")}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
        size: 120,
      },
      {
        accessorKey: "next_due",
        header: "Next Due",
        cell: ({ row }) => {
          const date = row.getValue("next_due") as string | null
          if (!date) return <span className="text-muted-foreground">-</span>

          const dueDate = new Date(date)
          const today = new Date()
          const isOverdue = dueDate < today
          const isDueSoon =
            !isOverdue &&
            dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000

          return (
            <span
              className={cn(
                "text-sm",
                isOverdue && "text-red-600 dark:text-red-400 font-semibold",
                isDueSoon && "text-amber-600 dark:text-amber-400 font-semibold",
                !isOverdue && !isDueSoon && "text-muted-foreground"
              )}
            >
              {isOverdue && <span className="mr-1">OVERDUE:</span>}
              {format(dueDate, "dd MMM yyyy")}
            </span>
          )
        },
        size: 140,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/equipment/${item.id}`)}
                >
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {userRole === "manager" && item.status === "active" && (
                  <DropdownMenuItem>Log PM Completion</DropdownMenuItem>
                )}
                <DropdownMenuItem>View Service History</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 48,
      },
    ],
    [router, userRole]
  )

  const table = useReactTable({
    data: equipment,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>No equipment found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-sm font-medium"
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
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => router.push(`/equipment/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm">
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

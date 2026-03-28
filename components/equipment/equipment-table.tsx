import { DataTable } from "@/components/ui/data-table"

interface EquipmentTableProps {
  equipment: (Equipment & { sops?: { id: string; title: string, sop_number: string } })[]
  userDepartment: string
  userRole: "manager" | "employee"
}

export function EquipmentTable({ equipment, userDepartment, userRole }: EquipmentTableProps) {
  const router = useRouter()
  const [sopModalOpen, setSopModalOpen] = useState(false)
  const [selectedSop, setSelectedSop] = useState<{ id: string, title?: string, number?: string } | null>(null)

  const columns: ColumnDef<Equipment & { sops?: { id: string; title: string, sop_number: string } }>[] = useMemo(
    () => [
      {
        accessorKey: "asset_id",
        header: "Asset ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-muted-foreground/80">{row.getValue("asset_id")}</span>
        ),
        size: 100,
      },
      {
        accessorKey: "name",
        header: "Equipment Name",
        cell: ({ row }) => (
          <span className="font-bold text-foreground tracking-tight">{row.getValue("name")}</span>
        ),
        size: 200,
      },
      {
        accessorKey: "department",
        header: "Dept",
        cell: ({ row }) => {
          const dept = row.getValue("department") as string
          return <DeptBadge department={dept} colour="blue" />
        },
        size: 100,
      },
      {
        id: "protocol",
        header: "Protocol",
        cell: ({ row }) => {
          const item = row.original
          if (!item.linked_sop_id) return <span className="text-[10px] font-bold uppercase text-muted-foreground/40 tracking-widest ml-2">None</span>
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-tight text-brand-blue hover:bg-brand-blue/5 border border-transparent hover:border-brand-blue/20 transition-all active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedSop({
                  id: item.linked_sop_id!,
                  title: item.sops?.title,
                  number: item.sops?.sop_number
                })
                setSopModalOpen(true)
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5 opacity-70" />
              {item.sops?.sop_number || 'VIEW'}
            </Button>
          )
        },
        size: 110,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.getValue("status")} />
        ),
        size: 100,
      },
      {
        accessorKey: "last_serviced",
        header: "Last PM",
        cell: ({ row }) => {
          const date = row.getValue("last_serviced") as string | null
          return date ? (
            <span className="text-xs font-bold text-muted-foreground/70 font-mono tracking-tighter">{format(new Date(date), "dd MMM yy")}</span>
          ) : (
            <span className="text-muted-foreground/30">-</span>
          )
        },
        size: 100,
      },
      {
        accessorKey: "next_due",
        header: "Next Due",
        cell: ({ row }) => {
          const date = row.getValue("next_due") as string | null
          if (!date) return <span className="text-muted-foreground/30 font-mono">-</span>

          const dueDate = new Date(date)
          const today = new Date()
          const isOverdue = dueDate < today
          const isDueSoon =
            !isOverdue &&
            dueDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000

          return (
            <div className="flex flex-col">
              <span
                className={cn(
                    "text-[11px] font-bold font-mono tracking-tighter",
                    isOverdue && "text-red-500",
                    isDueSoon && "text-amber-500",
                    !isOverdue && !isDueSoon && "text-brand-teal"
                )}
              >
                {format(dueDate, "dd MMM yy")}
              </span>
              {isOverdue && <span className="text-[8px] font-black uppercase text-red-500 tracking-[0.2em] -mt-1">OVERDUE</span>}
              {isDueSoon && <span className="text-[8px] font-black uppercase text-amber-500 tracking-[0.2em] -mt-1">UPCOMING</span>}
            </div>
          )
        },
        size: 120,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-border/40 shadow-xl backdrop-blur-md">
                  <DropdownMenuItem
                    className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                    onClick={() => router.push(`/equipment/${item.id}`)}
                  >
                    View Full Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {userRole === "manager" && item.status === "active" && (
                    <DropdownMenuItem className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer text-brand-teal">
                      Log PM Completion
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                    View Service History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        size: 48,
      },
    ],
    [router, userRole]
  )

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={equipment}
        pagination={true}
        pageSize={10}
        onRowClick={(row) => router.push(`/equipment/${row.id}`)}
        noDataMessage="No equipment matching your criteria was found."
      />

      <SopReadModal 
        sopId={selectedSop?.id || null}
        sopNumber={selectedSop?.number}
        sopTitle={selectedSop?.title}
        open={sopModalOpen}
        onOpenChange={setSopModalOpen}
      />
    </div>
  )
}

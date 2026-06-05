"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { BookOpen, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DeptBadge } from "@/components/ui/dept-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { SopRecord } from "@/types/app.types"

interface SopMasterIndexClientProps {
  sops: SopRecord[]
  departments: string[]
}

const levelLabels: Record<string, { title: string; description: string }> = {
  level_1: { title: "Level I", description: "Quality manuals and policies" },
  level_2: { title: "Level II", description: "SOPs and protocols" },
  level_3: { title: "Level III", description: "Work instructions, specifications, methods" },
  level_4: { title: "Level IV", description: "Records, forms, logs" },
}

const levelOrder = ["level_1", "level_2", "level_3", "level_4"]

export function SopMasterIndexClient({ sops, departments }: SopMasterIndexClientProps) {
  const [department, setDepartment] = useState("all")
  const [search, setSearch] = useState("")

  const filteredSops = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sops.filter((sop) => {
      if (department !== "all" && sop.department !== department) return false
      if (!q) return true
      return (
        sop.sop_number.toLowerCase().includes(q) ||
        sop.title.toLowerCase().includes(q) ||
        sop.department.toLowerCase().includes(q) ||
        sop.version.toLowerCase().includes(q)
      )
    })
  }, [sops, department, search])

  const grouped = useMemo(() => {
    return levelOrder.map((level) => ({
      level,
      items: filteredSops
        .filter((sop) => (sop.document_level || "level_2") === level)
        .sort((a, b) => a.department.localeCompare(b.department) || a.sop_number.localeCompare(b.sop_number)),
    }))
  }, [filteredSops])

  return (
    <div className="p-0 md:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SOP Master Index</h1>
            <p className="text-sm text-muted-foreground">Active documents grouped by GMP hierarchy level</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 mt-6 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SOP number, title, department..."
              className="pl-9"
            />
          </div>

          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 no-scrollbar">
            <FilterButton label="All Departments" active={department === "all"} onClick={() => setDepartment("all")} />
            {departments.map((dept) => (
              <FilterButton key={dept} label={dept} active={department === dept} onClick={() => setDepartment(dept)} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {grouped.map(({ level, items }) => {
            const label = levelLabels[level]
            return (
              <section key={level} className="space-y-3">
                <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{label.title}</h2>
                    <p className="text-xs text-muted-foreground">{label.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{items.length} active</span>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SOP No.</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Version</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Effective</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Review Due</th>
                          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((sop) => (
                          <tr key={sop.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <Link href={`/library/${sop.id}`} className="font-mono text-xs font-semibold text-brand-blue hover:underline">
                                {sop.sop_number}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{sop.title}</td>
                            <td className="px-4 py-3"><DeptBadge department={sop.department} colour="blue" /></td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sop.version}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {sop.effective_date ? format(new Date(sop.effective_date), "dd MMM yyyy") : "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {sop.due_for_revision ? format(new Date(sop.due_for_revision), "dd MMM yyyy") : "-"}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={sop.status} size="sm" /></td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              No active documents in this level.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="h-8 shrink-0 rounded-md px-3 text-xs font-semibold"
    >
      {label}
    </Button>
  )
}

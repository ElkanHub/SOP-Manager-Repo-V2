"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EquipmentTable } from "@/components/equipment/equipment-table"
import { AddEquipmentModal } from "@/components/equipment/add-equipment-modal"
import { Wrench, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Equipment, Profile, Department } from "@/types/app.types"

interface EquipmentPageClientProps {
  equipment: Equipment[]
  profile: Profile
  departments: Department[]
  assignableUsers: any[]
  isManager: boolean
  statusFilter?: string
}

export function EquipmentPageClient({
  equipment,
  profile,
  departments,
  assignableUsers,
  isManager,
  statusFilter,
}: EquipmentPageClientProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)

  return (
    <div className="p-0 md:p-6">
      {/* <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Equipment Registry</h1>
        {isManager && (
          <Button
            className="bg-brand-teal hover:bg-teal-600"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        )}
      </div> */}
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6 py-4 shrink-0">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Equipment Registry</h1>
            <p className="text-muted-foreground">Manage equipment and maintenance schedules</p>
          </div>
        </div>
        {isManager && (
          <Button
            className="bg-brand-teal hover:bg-teal-600"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3 mb-4 px-4 md:px-0">
        <StatusFilterTab
          label="All"
          active={!statusFilter}
          href="/equipment"
        />
        <StatusFilterTab
          label="Active"
          active={statusFilter === "active"}
          href="/equipment?status=active"
        />
        {isManager && (
          <>
            <StatusFilterTab
              label="Pending QA"
              active={statusFilter === "pending_qa"}
              href="/equipment?status=pending_qa"
            />
            <StatusFilterTab
              label="Inactive"
              active={statusFilter === "inactive"}
              href="/equipment?status=inactive"
            />
          </>
        )}
      </div>

      <div className="px-4 md:px-0">
        <EquipmentTable
          equipment={equipment}
          userDepartment={profile.department}
          userRole={profile.role}
        />
      </div>

      {isManager && (
        <AddEquipmentModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          departments={departments}
          currentUser={profile}
          assignableUsers={assignableUsers}
        />
      )}
    </div>
  )
}

function StatusFilterTab({
  label,
  active,
  href,
}: {
  label: string
  active: boolean
  href: string
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-card shadow-sm border border-border text-brand-blue"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </a>
  )
}

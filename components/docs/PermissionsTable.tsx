import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PermissionRow {
  action: string
  employee: boolean | string
  manager: boolean | string
  qa: boolean | string
  admin: boolean | string
}

const permissions: PermissionRow[] = [
  { action: 'Read Active SOPs (Own Dept)', employee: true, manager: true, qa: true, admin: true },
  { action: 'Search Active SOPs (Org-wide)', employee: true, manager: true, qa: true, admin: true },
  { action: 'Acknowledge SOPs', employee: true, manager: true, qa: true, admin: true },
  { action: 'Submit SOP for Approval', employee: false, manager: true, qa: true, admin: 'If Manager' },
  { action: 'Approve SOP Submissions', employee: false, manager: false, qa: true, admin: false },
  { action: 'Sign Change Control', employee: false, manager: true, qa: true, admin: 'If Manager' },
  { action: 'Waive CC Signature', employee: false, manager: false, qa: false, admin: true },
  { action: 'Add New Equipment', employee: false, manager: true, qa: true, admin: 'If Manager' },
  { action: 'Log PM Completion', employee: true, manager: true, qa: true, admin: true },
  { action: 'Reassign PM Task', employee: false, manager: true, qa: true, admin: 'If Manager' },
  { action: 'View Audit Logs', employee: false, manager: false, qa: true, admin: true },
  { action: 'Manage Users', employee: false, manager: false, qa: false, admin: true },
  { action: 'Manage Departments', employee: false, manager: false, qa: false, admin: true },
  { action: 'Broadcast Notices', employee: true, manager: true, qa: true, admin: true },
]

export function PermissionsTable() {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border shadow-sm">
      <table className="w-full border-collapse text-left text-13">
        <thead>
          <tr className="bg-brand-navy text-white">
            <th className="px-4 py-3 font-semibold border-r border-white/10">Action</th>
            <th className="px-4 py-3 font-semibold border-r border-white/10 text-center">Employee</th>
            <th className="px-4 py-3 font-semibold border-r border-white/10 text-center">Manager</th>
            <th className="px-4 py-3 font-semibold border-r border-white/10 text-center">QA Manager</th>
            <th className="px-4 py-3 font-semibold text-center">Admin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {permissions.map((row, i) => (
            <tr key={row.action} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
              <td className="px-4 py-3 text-foreground font-medium border-r border-border/40">{row.action}</td>
              <td className="px-4 py-3 border-r border-border/40 text-center align-middle">
                {renderCell(row.employee)}
              </td>
              <td className="px-4 py-3 border-r border-border/40 text-center align-middle">
                {renderCell(row.manager)}
              </td>
              <td className="px-4 py-3 border-r border-border/40 text-center align-middle">
                {renderCell(row.qa)}
              </td>
              <td className="px-4 py-3 text-center align-middle">
                {renderCell(row.admin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderCell(val: boolean | string) {
  if (val === true) {
    return <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
  }
  if (val === false) {
    return <span className="text-slate-300">—</span>
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <CheckCircle2 className="h-4 w-4 text-amber-500 mx-auto" />
      <span className="text-[10px] text-slate-500 leading-none">{val}</span>
    </div>
  )
}

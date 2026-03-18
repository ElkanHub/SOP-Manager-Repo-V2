import React from 'react'
import { cn } from '@/lib/utils/cn'

export type Role = 'employee' | 'manager' | 'qa' | 'admin'

interface RoleBadgeProps {
  role: Role
}

const styles: Record<Role, string> = {
  employee: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-50 text-blue-700',
  qa: 'bg-indigo-50 text-indigo-700',
  admin: 'bg-purple-50 text-purple-700'
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={cn(
      'text-11 px-2 py-0.5 rounded-full font-500 inline-flex items-center whitespace-nowrap',
      styles[role]
    )}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

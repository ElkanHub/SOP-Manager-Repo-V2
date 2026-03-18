import React from 'react'
import { cn } from '@/lib/utils/cn'

export type Role = 'employee' | 'manager' | 'qa' | 'admin'

interface RoleBadgeProps {
  role: Role
}

const styles: Record<Role, string> = {
  employee: 'bg-muted text-muted-foreground border-border/50',
  manager: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/20',
  qa: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/20',
  admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/20'
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

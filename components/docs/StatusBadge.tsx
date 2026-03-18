import React from 'react'
import { cn } from '@/lib/utils/cn'
import { Lock } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'draft' | 'pending_qa' | 'pending_cc' | 'superseded' | string
}

const styles: Record<string, { bg: string; text: string; dot: string; border: string; label: string }> = {
  active:      { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200/20', label: 'Active' },
  draft:       { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500',   border: 'border-amber-200/20',   label: 'Draft' },
  pending_qa:  { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-500',    border: 'border-blue-200/20',    label: 'Pending QA' },
  pending_cc:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400',  dot: 'bg-indigo-500',  border: 'border-indigo-200/20',  label: 'Pending CC' },
  superseded:  { bg: 'bg-muted',          text: 'text-muted-foreground',               dot: 'bg-muted-foreground/50', border: 'border-border/50',  label: 'Superseded' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status] || styles.active
  const isPendingCc = status === 'pending_cc'

  return (
    <span className={cn(
      'text-[11px] px-2.5 py-1 rounded-lg inline-flex items-center font-bold tracking-wide border shadow-sm uppercase whitespace-nowrap',
      style.bg,
      style.text,
      style.border
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full mr-2 shadow-sm', style.dot)} />
      {style.label}
      {isPendingCc && <Lock className="h-3 w-3 ml-1.5 opacity-70" />}
    </span>
  )
}


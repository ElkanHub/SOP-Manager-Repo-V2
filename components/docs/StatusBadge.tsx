import React from 'react'
import { cn } from '@/lib/utils/cn'
import { Lock } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'draft' | 'pending_qa' | 'pending_cc' | 'superseded' | string
}

const styles: Record<string, { bg: string; text: string; dot: string; border: string; label: string }> = {
  active:      { bg: 'bg-emerald-50/50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200/50', label: 'Active' },
  draft:       { bg: 'bg-amber-50/50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200/50',   label: 'Draft' },
  pending_qa:  { bg: 'bg-blue-50/50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200/50',    label: 'Pending QA' },
  pending_cc:  { bg: 'bg-indigo-50/50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  border: 'border-indigo-200/50',  label: 'Pending CC' },
  superseded:  { bg: 'bg-slate-50/50',   text: 'text-slate-500',   dot: 'bg-slate-400',   border: 'border-slate-200/50',   label: 'Superseded' },
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


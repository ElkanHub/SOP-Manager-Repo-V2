import React from 'react'
import { cn } from '@/lib/utils/cn'
import { Lock } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'draft' | 'pending_qa' | 'pending_cc' | 'superseded' | string
}

const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active:      { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-600', label: 'Active' },
  draft:       { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-600', label: 'Draft' },
  pending_qa:  { bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-600',  label: 'Pending QA' },
  pending_cc:  { bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-600',  label: 'Pending CC' },
  superseded:  { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Superseded' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status] || styles.active
  const isPendingCc = status === 'pending_cc'

  return (
    <span className={cn(
      'text-12 px-2 py-0.5 rounded-full inline-flex items-center font-medium border border-transparent whitespace-nowrap',
      style.bg,
      style.text
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', style.dot)} />
      {style.label}
      {isPendingCc && <Lock className="h-3 w-3 ml-1" />}
    </span>
  )
}

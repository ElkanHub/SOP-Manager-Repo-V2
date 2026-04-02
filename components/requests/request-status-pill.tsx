'use client'

import { RequestStatus } from '@/types/app.types'
import { cn } from '@/lib/utils'

interface RequestStatusPillProps {
  status: RequestStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  submitted: {
    label: 'Waiting for QA',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  received: {
    label: 'Received by QA',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  fulfilled: {
    label: 'Fulfilled',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
}

export function RequestStatusPill({ status, size = 'md' }: RequestStatusPillProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

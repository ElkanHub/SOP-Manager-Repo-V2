'use client'

import { DocumentRequest } from '@/types/app.types'
import { format } from 'date-fns'
import { CheckCircle2, Clock, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RequestTimelineProps {
  request: DocumentRequest
  compact?: boolean
}

type Stage = {
  label: string
  doneAt: string | null
  byName?: string | null
}

export function RequestTimeline({ request, compact = false }: RequestTimelineProps) {
  const stages: Stage[] = [
    {
      label: 'Submitted',
      doneAt: request.submitted_at,
      byName: request.requester_name,
    },
    {
      label: 'Received',
      doneAt: request.received_at,
      byName: request.received_by_profile?.full_name,
    },
    {
      label: 'Approved',
      doneAt: request.approved_at,
      byName: request.approved_by_profile?.full_name,
    },
    {
      label: 'Fulfilled',
      doneAt: request.fulfilled_at,
      byName: request.fulfilled_by_profile?.full_name,
    },
  ]

  const lastDoneIndex = stages.reduce((acc, s, i) => (s.doneAt ? i : acc), -1)

  return (
    <div className={cn('flex flex-col gap-0', compact ? 'text-xs' : 'text-sm')}>
      {stages.map((stage, i) => {
        const isDone = !!stage.doneAt
        const isCurrent = i === lastDoneIndex && i < stages.length - 1
        const isLast = i === stages.length - 1

        return (
          <div key={stage.label} className="flex items-start gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full shrink-0',
                  compact ? 'w-5 h-5' : 'w-6 h-6',
                  isDone && i === lastDoneIndex && !isLast
                    ? 'text-amber-500'
                    : isDone
                    ? 'text-brand-teal'
                    : 'text-muted-foreground/30'
                )}
              >
                {isDone && i === lastDoneIndex && !isLast ? (
                  <Clock className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', 'animate-pulse')} />
                ) : isDone ? (
                  <CheckCircle2 className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
                ) : (
                  <Circle className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 min-h-[16px]',
                    isDone ? 'bg-brand-teal/40' : 'bg-border'
                  )}
                />
              )}
            </div>

            {/* Text */}
            <div className={cn('pb-3', isLast && 'pb-0')}>
              <span
                className={cn(
                  'font-medium',
                  isDone ? 'text-foreground' : 'text-muted-foreground/50'
                )}
              >
                {stage.label}
              </span>
              {isDone && stage.doneAt && (
                <div className="text-muted-foreground">
                  {format(new Date(stage.doneAt), 'd MMM yyyy, h:mm a')}
                  {stage.byName && i > 0 && (
                    <span className="ml-1">· by {stage.byName}</span>
                  )}
                </div>
              )}
              {!isDone && (
                <div className="text-muted-foreground/40">—</div>
              )}
              {/* QA notes shown under Fulfilled */}
              {stage.label === 'Fulfilled' && isDone && request.qa_notes && (
                <div className="mt-1 text-muted-foreground italic text-xs bg-muted/60 px-2 py-1 rounded">
                  "{request.qa_notes}"
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

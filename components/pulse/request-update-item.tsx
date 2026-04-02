'use client'

import { ClipboardList } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface RequestUpdateItemProps {
  item: {
    id: string
    title: string
    body?: string
    entity_id?: string
    created_at: string
  }
}

export function RequestUpdateItem({ item }: RequestUpdateItemProps) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0 mt-0.5">
        <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
        {item.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          <Link
            href="/requests"
            className="text-[10px] text-brand-teal hover:underline font-medium"
          >
            View Request →
          </Link>
        </div>
      </div>
    </div>
  )
}

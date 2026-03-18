import React from 'react'
import { Info, AlertTriangle, Lightbulb, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'danger'
  children: React.ReactNode
}

const styles = {
  info: {
    container: 'bg-indigo-500/10 border-indigo-200/30 dark:border-indigo-500/20',
    icon: Info,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    strong: 'text-indigo-900 dark:text-indigo-300',
    title: 'Note'
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-200/30 dark:border-amber-500/20',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    strong: 'text-amber-900 dark:text-amber-300',
    title: 'Caution'
  },
  tip: {
    container: 'bg-emerald-500/10 border-emerald-200/30 dark:border-emerald-500/20',
    icon: Lightbulb,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    strong: 'text-emerald-900 dark:text-emerald-300',
    title: 'Pro Tip'
  },
  danger: {
    container: 'bg-rose-500/10 border-rose-200/30 dark:border-rose-500/20',
    icon: AlertOctagon,
    iconColor: 'text-rose-600 dark:text-rose-400',
    strong: 'text-rose-900 dark:text-rose-300',
    title: 'Important'
  }
}

export function Callout({ type, children }: CalloutProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={cn(
      'flex gap-4 p-5 rounded-2xl my-8 border shadow-sm transition-colors',
      style.container
    )}>
      <div className={cn('flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-soft ring-1 ring-border/50', style.iconColor)}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <span className={cn('text-[11px] font-bold uppercase tracking-widest block mb-1.5', style.iconColor)}>
          {style.title}
        </span>
        <div className={cn(
          'text-[15px] leading-relaxed text-muted-foreground font-sans',
          `[&>strong]:font-bold [&>strong]:${style.strong}`
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}


import React from 'react'
import { Info, AlertTriangle, Lightbulb, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'danger'
  children: React.ReactNode
}

const styles = {
  info: {
    container: 'bg-indigo-50/50 border-indigo-200/60',
    icon: Info,
    iconColor: 'text-indigo-600',
    strong: 'text-indigo-900',
    title: 'Note'
  },
  warning: {
    container: 'bg-amber-50/50 border-amber-200/60',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    strong: 'text-amber-900',
    title: 'Caution'
  },
  tip: {
    container: 'bg-emerald-50/50 border-emerald-200/60',
    icon: Lightbulb,
    iconColor: 'text-emerald-600',
    strong: 'text-emerald-900',
    title: 'Pro Tip'
  },
  danger: {
    container: 'bg-rose-50/50 border-rose-200/60',
    icon: AlertOctagon,
    iconColor: 'text-rose-600',
    strong: 'text-rose-900',
    title: 'Important'
  }
}

export function Callout({ type, children }: CalloutProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={cn(
      'flex gap-4 p-5 rounded-2xl my-8 border shadow-sm',
      style.container
    )}>
      <div className={cn('flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-soft', style.iconColor)}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <span className={cn('text-[11px] font-bold uppercase tracking-widest block mb-1.5', style.iconColor)}>
          {style.title}
        </span>
        <div className={cn(
          'text-[15px] leading-relaxed text-slate-600 font-sans',
          `[&>strong]:font-bold [&>strong]:${style.strong}`
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}


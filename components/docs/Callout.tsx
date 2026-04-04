import React from 'react'
import { Info, AlertTriangle, Lightbulb, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'danger'
  children: React.ReactNode
}

const styles = {
  info: {
    container: 'bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-200/50 shadow-indigo-500/5 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:border-indigo-500/20',
    icon: Info,
    iconBg: 'bg-gradient-to-br from-indigo-500 rounded-full',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    strong: 'text-indigo-900 dark:text-indigo-200',
    title: 'Note'
  },
  warning: {
    container: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-200/50 shadow-amber-500/5 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:border-amber-500/20',
    icon: AlertTriangle,
    iconBg: 'bg-gradient-to-br from-amber-500 rounded-full',
    iconColor: 'text-amber-600 dark:text-amber-400',
    strong: 'text-amber-900 dark:text-amber-200',
    title: 'Caution'
  },
  tip: {
    container: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-200/50 shadow-emerald-500/5 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:border-emerald-500/20',
    icon: Lightbulb,
    iconBg: 'bg-gradient-to-br from-emerald-500 rounded-full',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    strong: 'text-emerald-900 dark:text-emerald-200',
    title: 'Pro Tip'
  },
  danger: {
    container: 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-200/50 shadow-rose-500/5 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:border-rose-500/20',
    icon: AlertOctagon,
    iconBg: 'bg-gradient-to-br from-rose-500 rounded-full',
    iconColor: 'text-rose-600 dark:text-rose-400',
    strong: 'text-rose-900 dark:text-rose-200',
    title: 'Important'
  }
}

export function Callout({ type, children }: CalloutProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={cn(
      'flex gap-4 p-5 rounded-2xl my-8 border backdrop-blur-sm transition-all duration-300 shadow-sm relative overflow-hidden group',
      style.container
    )}>
      {/* Decorative gradient corner */}
      <div className={cn(
        'absolute -top-10 -right-10 w-20 h-20 opacity-20 blur-xl group-hover:opacity-40 transition-opacity',
        style.iconBg
      )} />

      <div className={cn('flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-white/80 dark:bg-black/20 flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 z-10', style.iconColor)}>
        <Icon size={20} />
      </div>
      <div className="flex-1 z-10">
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.2em] block mb-1.5', style.iconColor)}>
          {style.title}
        </span>
        <div className={cn(
          'text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 font-sans font-medium',
          `[&>strong]:font-bold [&>strong]:${style.strong}`
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}


import React from 'react'
import { Info, AlertTriangle, Lightbulb, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CalloutProps {
  type: 'info' | 'warning' | 'tip' | 'danger'
  children: React.ReactNode
}

const styles = {
  info: {
    container: 'bg-blue-50 border-blue-400',
    icon: Info,
    iconColor: 'text-blue-600',
    strong: 'text-blue-800'
  },
  warning: {
    container: 'bg-amber-50 border-amber-400',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    strong: 'text-amber-800'
  },
  tip: {
    container: 'bg-teal-50 border-[#00C2A8]',
    icon: Lightbulb,
    iconColor: 'text-[#00C2A8]',
    strong: 'text-teal-800'
  },
  danger: {
    container: 'bg-red-50 border-red-400',
    icon: AlertOctagon,
    iconColor: 'text-red-600',
    strong: 'text-red-800'
  }
}

export function Callout({ type, children }: CalloutProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={cn(
      'flex gap-3 p-4 rounded-r-lg my-6 border-l-4',
      style.container
    )}>
      <Icon className={cn('flex-shrink-0 mt-0.5 h-4 w-4', style.iconColor)} />
      <div className={cn(
        'text-14 leading-relaxed text-slate-700 [&>strong]:font-semibold',
        `[&>strong]:${style.strong}`
      )}>
        {children}
      </div>
    </div>
  )
}

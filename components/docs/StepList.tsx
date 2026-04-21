import React from 'react'

interface StepListProps {
  children: React.ReactNode
}

export function StepList({ children }: StepListProps) {
  return (
    <div className="relative mb-16 pl-2">
      <div className="absolute left-[23px] top-10 bottom-10 w-[2px] bg-border" />
      {children}
    </div>
  )
}

interface StepProps {
  number: number
  title: string
  children: React.ReactNode
}

export function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-6 mb-12 relative group">
      <div className="w-10 h-10 flex-shrink-0 bg-background border-2 border-brand-navy dark:border-brand-teal text-brand-navy dark:text-brand-teal rounded-xl flex items-center justify-center font-mono text-14 font-bold relative z-10 shadow-sm group-hover:bg-brand-navy dark:group-hover:bg-brand-teal group-hover:text-white transition-all duration-300">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <h4 className="text-[18px] font-bold text-brand-navy dark:text-brand-teal mb-3 tracking-tight group-hover:text-brand-blue transition-colors">{title}</h4>
        <div className="text-[16px] text-muted-foreground leading-relaxed font-sans">
          {children}
        </div>
      </div>
    </div>
  )
}

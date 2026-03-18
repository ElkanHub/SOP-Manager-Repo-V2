import React from 'react'

interface StepListProps {
  children: React.ReactNode
}

export function StepList({ children }: StepListProps) {
  return (
    <div className="relative mb-12">
      <div className="absolute left-[11px] top-6 bottom-6 w-[1px] bg-slate-200" />
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
    <div className="flex gap-4 mb-8 relative">
      <div className="w-6 h-6 flex-shrink-0 bg-[#0D2B55] text-white rounded-full flex items-center justify-center font-mono text-12 font-semibold relative z-10">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="text-16 font-semibold text-slate-900 mb-2">{title}</h4>
        <div className="text-14 text-slate-700 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

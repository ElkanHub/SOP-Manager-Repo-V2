import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface QuickNavLink {
  label: string
  href: string
  description?: string
}

interface QuickNavProps {
  // Marked as optional (?) so TypeScript doesn't complain when the prop is missing
  links?: QuickNavLink[] 
}

export function QuickNav({ links = [] }: QuickNavProps) {
  // Safety check: verify links is an array and has items
  if (!Array.isArray(links) || links.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-10">
      {links.map((link) => (
        <Link 
          key={link.href}
          href={link.href}
          className="group relative flex flex-col p-6 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-400/50 hover:shadow-soft transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2">
            <h5 className="text-[16px] font-bold text-[#0D2B55] group-hover:text-[#1A5EA8] transition-colors tracking-tight">
              {link.label}
            </h5>
            <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-[#1A5EA8] transition-all">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          {link.description && (
            <p className="text-[14px] text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
              {link.description}
            </p>
          )}
          
          {/* Subtle indicator bottom border */}
          <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-[#1A5EA8] to-[#00C2A8] opacity-0 group-hover:opacity-100 transition-opacity rounded-full mt-auto" />
        </Link>
      ))}
    </div>
  )

}
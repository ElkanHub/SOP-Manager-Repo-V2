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
          className="group relative flex flex-col p-6 bg-card border border-border/80 rounded-2xl hover:border-brand-blue/30 hover:shadow-soft transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2">
            <h5 className="text-[16px] font-bold text-foreground group-hover:text-brand-blue transition-colors tracking-tight">
              {link.label}
            </h5>
            <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-all">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          {link.description && (
            <p className="text-[14px] text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
              {link.description}
            </p>
          )}
          
          {/* Subtle indicator bottom border */}
          <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-brand-blue to-brand-teal opacity-0 group-hover:opacity-100 transition-opacity rounded-full mt-auto" />
        </Link>
      ))}
    </div>
  )

}
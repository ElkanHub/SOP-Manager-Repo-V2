import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface QuickNavLink {
  label: string
  href: string
  description?: string
}

interface QuickNavProps {
  links: QuickNavLink[]
}

export function QuickNav({ links }: QuickNavProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-8">
      {links.map((link) => (
        <Link 
          key={link.href}
          href={link.href}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#00C2A8] hover:shadow-sm transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h5 className="text-14 font-semibold text-slate-900 group-hover:text-[#00C2A8] transition-colors">
                {link.label}
              </h5>
              {link.description && (
                <p className="text-12 text-slate-500 mt-1">{link.description}</p>
              )}
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-1 group-hover:text-[#00C2A8] transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  )
}

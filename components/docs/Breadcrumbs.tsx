"use client"
import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BreadcrumbsProps {
  section?: string
  title?: string
}

export function Breadcrumbs({ section, title }: BreadcrumbsProps) {
  const pathname = usePathname()
  
  // Format section ID to human readable
  const formatSection = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <nav className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground mb-8" aria-label="Breadcrumb">
      <Link 
        href="/docs" 
        className="flex items-center gap-1 hover:text-brand-blue transition-colors"
      >
        <Home size={14} />
        <span>Docs</span>
      </Link>
      
      {section && (
        <>
          <ChevronRight size={14} className="text-muted-foreground/30" />
          <span className="hover:text-brand-blue transition-colors cursor-default">
            {formatSection(section)}
          </span>
        </>
      )}
      
      {title && (
        <>
          <ChevronRight size={14} className="text-muted-foreground/30" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">
            {title}
          </span>
        </>
      )}
    </nav>
  )
}

"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ArrowUpRight, Menu, X, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const SECTIONS = [
  { id: 'getting-started', label: 'GETTING STARTED' },
  { id: 'the-pulse', label: 'THE PULSE' },
  { id: 'sop-library', label: 'SOP LIBRARY' },
  { id: 'approvals', label: 'APPROVALS', badge: 'QA' },
  { id: 'change-control', label: 'CHANGE CONTROL' },
  { id: 'equipment', label: 'EQUIPMENT & PM' },
  { id: 'calendar', label: 'CALENDAR' },
  { id: 'reports', label: 'REPORTS' },
  { id: 'messaging', label: 'MESSAGING' },
  { id: 'settings', label: 'SETTINGS' },
  { id: 'admin', label: 'ADMIN', badge: 'Admin' },
  { id: 'reference', label: 'REFERENCE' },
]

const ROLES = ['All', 'Employee', 'Manager', 'QA', 'Admin']

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [selectedRole, setSelectedRole] = useState('All')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isHome = pathname === '/docs'

  // Mock content structure - in real app this would be derived from MDX files
  const pages = [
    { slug: 'getting-started/introduction', title: 'Introduction', section: 'getting-started' },
    { slug: 'getting-started/quickstart', title: 'Quickstart guide', section: 'getting-started' },
    // ... add more as they are created
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* TopBar */}
      <header className="h-[56px] fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/docs" className="text-13 font-bold text-[#0D2B55] tracking-[0.08em]">SOP-GUARD PRO</Link>
          <span className="mx-3 text-slate-300">/</span>
          <span className="text-13 text-slate-500">Documentation</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-sm mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search docs..." 
            className="w-full h-8 bg-[#F8FAFC] border border-slate-200 rounded-md pl-9 pr-12 text-13 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/20 focus:border-[#00C2A8]"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-100 text-slate-500 text-[11px] px-1.5 py-0.5 rounded border border-slate-200">
            ⌘K
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden sm:flex items-center text-13 text-[#1A5EA8] hover:underline">
            Back to app <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-[56px]">
        {/* Sidebar */}
        {!isHome && (
          <aside className={cn(
            "fixed inset-0 top-[56px] z-40 md:sticky md:block w-[260px] bg-white border-r border-slate-200 h-[calc(100vh-56px)] overflow-y-auto px-4 py-6 transition-transform md:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="mb-6">
              <span className="text-[11px] uppercase text-slate-400 font-semibold tracking-wide block mb-2">Show content for:</span>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-colors",
                      selectedRole === role ? "bg-[#0D2B55] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <nav className="space-y-6">
              {SECTIONS.map(section => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 px-2 py-1 mt-5 mb-1 text-[11px] uppercase font-semibold text-slate-400 tracking-wide">
                    {section.label}
                    {section.badge === 'QA' && (
                      <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">QA</span>
                    )}
                    {section.badge === 'Admin' && (
                      <span className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {/* Page links would go here */}
                    {pages.filter(p => p.section === section.id).map(page => (
                      <Link
                        key={page.slug}
                        href={`/docs/${page.slug}`}
                        className={cn(
                          "flex items-center justify-between h-[30px] px-3 py-1.5 rounded-md text-13 transition-all",
                          pathname === `/docs/${page.slug}` 
                            ? "bg-[#EFF6FF] text-[#1A5EA8] font-medium border-l-2 border-[#00C2A8]" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        {page.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        )}

        <main className={cn(
          "flex-1 overflow-y-auto",
          isHome ? "w-full" : "max-w-3xl mx-auto px-8 py-10"
        )}>
          {children}
        </main>

        {/* On-page nav (ToC) */}
        {!isHome && (
          <aside className="hidden xl:block w-[200px] sticky top-[80px] h-fit px-4 border-l border-slate-100">
            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-3 block px-2">On this page</span>
            <div id="table-of-contents" className="space-y-1">
              {/* This would be populated dynamically */}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

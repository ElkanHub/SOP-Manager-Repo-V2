"use client"
import React from 'react'
import Link from 'next/link'
import { Rocket, BookOpen, Shield, BookmarkCheck, ClipboardCheck, GitBranch, Cog, CalendarDays, BarChart2, MessageSquare, Settings, Search as SearchIcon } from 'lucide-react'
import { Search as DocsSearch } from '@/components/docs'
import { cn } from '@/lib/utils/cn'

const FEATURES = [
  { id: 'the-pulse', icon: BookmarkCheck, title: 'The Pulse', description: 'Real-time notifications, notices, and personal to-dos.', href: '/docs/the-pulse/overview', badge: null },
  { id: 'sop-library', icon: BookOpen, title: 'SOP Library', description: 'Read, search, acknowledge, and submit procedures.', href: '/docs/sop-library/overview', badge: null },
  { id: 'approvals', icon: ClipboardCheck, title: 'Approvals', description: 'Review and approve SOP submissions.', href: '/docs/approvals/overview', badge: 'QA' },
  { id: 'change-control', icon: GitBranch, title: 'Change Control', description: 'Manage version changes with digital signatures.', href: '/docs/change-control/overview', badge: null },
  { id: 'equipment', icon: Cog, title: 'Equipment & PM', description: 'Track assets and schedule preventive maintenance.', href: '/docs/equipment/overview', badge: null },
  { id: 'calendar', icon: CalendarDays, title: 'Calendar', description: 'View PM schedules and team events.', href: '/docs/calendar/overview', badge: null },
  { id: 'reports', icon: BarChart2, title: 'Reports', description: 'Audit trails, compliance logs, and AI insights.', href: '/docs/reports/overview', badge: null },
  { id: 'messaging', icon: MessageSquare, title: 'Messaging', description: 'Direct messages and group chats with record references.', href: '/docs/messaging/overview', badge: null },
  { id: 'settings', icon: Settings, title: 'Settings & Admin', description: 'Profile, users, departments, and organisation setup.', href: '/docs/settings/your-profile', badge: 'Admin' },
]

export function DocsHomeContent() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#0D2B55] py-16 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-[var(--font-dm-sans)] text-[38px] font-medium text-white leading-tight">
            SOP-Guard Pro Documentation
          </h1>
          <p className="text-18 text-white/70 mt-4 max-w-xl mx-auto leading-relaxed">
            Everything you need to use SOP-Guard Pro confidently — from your first day to advanced admin setup.
          </p>

          {/* Search Bar */}
          <div className="mt-12 max-w-lg mx-auto">
            <DocsSearch variant="large" />
          </div>

          {/* Quick Start Cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link 
              href="/docs/getting-started/quickstart"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-all text-left group shadow-sm"
            >
              <Rocket className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-semibold text-white mt-4 group-hover:text-[#00C2A8] transition-colors tracking-tight">Quickstart guide</p>
              <p className="text-13 text-white/70 mt-1 leading-snug">Up and running in 10 minutes.</p>
            </Link>
            <Link 
              href="#features"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-all text-left group shadow-sm"
            >
              <BookOpen className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-semibold text-white mt-4 group-hover:text-[#00C2A8] transition-colors tracking-tight">Feature guides</p>
              <p className="text-13 text-white/70 mt-1 leading-snug">Find the module you need.</p>
            </Link>
            <Link 
              href="/docs/admin/first-setup"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-all text-left group shadow-sm"
            >
              <Shield className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-semibold text-white mt-4 group-hover:text-[#00C2A8] transition-colors tracking-tight">Admin setup guide</p>
              <p className="text-13 text-white/70 mt-1 leading-snug">Configure your organisation from scratch.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-32 font-bold text-[#0D2B55] tracking-tight mb-4">
              Documentation by feature
            </h2>
            <p className="text-18 text-slate-500 max-w-2xl mx-auto">
              Select a topic to jump directly to what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(feature => (
              <Link
                key={feature.id}
                href={feature.href}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-soft hover:border-indigo-400/50 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#1A5EA8] group-hover:bg-indigo-50 transition-colors">
                    <feature.icon size={20} />
                  </div>
                  {feature.badge && (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest",
                      feature.badge === 'QA' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    )}>
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-[17px] font-bold text-[#0D2B55] group-hover:text-[#1A5EA8] transition-colors tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-slate-500 mt-2 leading-relaxed group-hover:text-slate-600 transition-colors">
                  {feature.description}
                </p>
                <div className="text-13 font-bold text-[#1A5EA8] mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Learn more <ChevronRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Help Footer */}
      <section className="bg-slate-50/50 border-t border-slate-100 py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h4 className="text-[20px] font-bold text-[#0D2B55] mb-2 tracking-tight">Can&apos;t find what you&apos;re looking for?</h4>
          <p className="text-slate-500 mb-8 text-16">Our team is ready to help you with any questions about SOP-Guard Pro.</p>
          <a 
            href="mailto:support@sopguard.com" 
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#0D2B55] text-white font-bold hover:bg-[#1A5EA8] transition-colors shadow-soft"
          >
            Contact support
          </a>
        </div>
      </section>
    </div>
  )
}

function ChevronRight({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}

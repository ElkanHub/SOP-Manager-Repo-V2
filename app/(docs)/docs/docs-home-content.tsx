"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Rocket, BookOpen, Shield, BookmarkCheck, ClipboardCheck, GitBranch, Cog, CalendarDays, BarChart2, MessageSquare, Settings } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#0D2B55] py-16 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-[var(--font-dm-sans)] text-[38px] font-medium text-white">
            SOP-Guard Pro Documentation
          </h1>
          <p className="text-18 text-white/70 mt-3 max-w-xl mx-auto">
            Everything you need to use SOP-Guard Pro confidently — from your first day to advanced admin setup.
          </p>

          {/* Search Bar */}
          <div className="mt-10 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the documentation..."
              className="w-full h-12 bg-white rounded-xl pl-12 pr-4 text-15 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00C2A8]/30"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-100 text-slate-500 text-[11px] px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </div>
          </div>

          {/* Quick Start Cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link 
              href="/docs/getting-started/quickstart"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-colors text-left group"
            >
              <Rocket className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-medium text-white mt-3 group-hover:text-[#00C2A8] transition-colors">Quickstart guide</p>
              <p className="text-13 text-white/70 mt-1">Up and running in 10 minutes.</p>
            </Link>
            <Link 
              href="#features"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-colors text-left group"
            >
              <BookOpen className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-medium text-white mt-3 group-hover:text-[#00C2A8] transition-colors">Feature guides</p>
              <p className="text-13 text-white/70 mt-1">Find the module you need.</p>
            </Link>
            <Link 
              href="/docs/admin/first-setup"
              className="bg-white/10 border border-white/20 rounded-xl p-6 hover:bg-white/15 cursor-pointer transition-colors text-left group"
            >
              <Shield className="h-6 w-6 text-[#00C2A8]" />
              <p className="text-16 font-medium text-white mt-3 group-hover:text-[#00C2A8] transition-colors">Admin setup guide</p>
              <p className="text-13 text-white/70 mt-1">Configure your organisation from scratch.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-24 font-medium text-slate-900 text-center mb-3">
            Documentation by feature
          </h2>
          <p className="text-16 text-slate-500 text-center mb-10">
            Select a topic to jump directly to what you need.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(feature => (
              <Link
                key={feature.id}
                href={feature.href}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-[#00C2A8] transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <feature.icon className="h-5 w-5 text-[#1A5EA8]" />
                  {feature.badge && (
                    <span className={feature.badge === 'QA' ? 'bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold' : 'bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold'}>
                      {feature.badge}
                    </span>
                  )}
                </div>
                <p className="text-15 font-medium text-slate-900 mt-4 group-hover:text-[#00C2A8] transition-colors">
                  {feature.title}
                </p>
                <p className="text-13 text-slate-500 mt-1.5 leading-relaxed">
                  {feature.description}
                </p>
                <span className="text-12 text-[#1A5EA8] mt-4 block group-hover:underline">
                  Learn more →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Help Footer */}
      <section className="bg-slate-50 border-t border-slate-200 py-10 text-center">
        <p className="text-15 text-slate-600">
          Can&apos;t find what you&apos;re looking for?
          <a href="mailto:support@sopguard.com" className="text-[#1A5EA8] hover:underline ml-2">
            Contact support
          </a>
        </p>
      </section>
    </div>
  )
}

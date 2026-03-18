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
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#081B33] via-[#0D2B55] to-[#0A2342] py-24 px-8 overflow-hidden border-b border-border/10">
        {/* Subtle background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-radial-gradient from-brand-teal via-transparent to-transparent opacity-20" />
        </div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_-4px_20px_rgba(0,194,168,0.1)]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="font-[var(--font-dm-sans)] text-[44px] md:text-[52px] font-bold text-white leading-[1.1] tracking-tightest mb-6 drop-shadow-sm">
            Knowledge <span className="text-brand-teal">Base</span>
          </h1>
          <p className="text-19 text-white/70 max-w-2xl mx-auto leading-relaxed font-medium mb-12">
            Everything you need to use SOP-Guard Pro confidently — from your first day to advanced organisation setup.
          </p>

          {/* Search Bar - Center and glow */}
          <div className="max-w-xl mx-auto mb-20 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal/20 to-brand-blue/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative">
              <DocsSearch variant="large" />
            </div>
          </div>

          {/* Quick Start Cards - Glassmorphism */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              href="/docs/getting-started/quickstart"
              className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-teal/10 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-teal mb-6 shadow-inner ring-1 ring-white/20 group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300">
                <Rocket size={24} />
              </div>
              <p className="text-18 font-bold text-white tracking-tight mb-2">Quickstart guide</p>
              <p className="text-14 text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">Up and running with Pro in &lt; 10 minutes.</p>
            </Link>

            <Link
              href="#features"
              className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-blue/10 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-teal mb-6 shadow-inner ring-1 ring-white/20 group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300">
                <BookOpen size={24} />
              </div>
              <p className="text-18 font-bold text-white tracking-tight mb-2">Feature guides</p>
              <p className="text-14 text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">Deep dives into every module and tool.</p>
            </Link>

            <Link
              href="/docs/admin/first-setup"
              className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-teal/10 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-teal mb-6 shadow-inner ring-1 ring-white/20 group-hover:bg-brand-teal group-hover:text-white transition-colors duration-300">
                <Shield size={24} />
              </div>
              <p className="text-18 font-bold text-white tracking-tight mb-2">Admin setup</p>
              <p className="text-14 text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">Strategic configuration for admins.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-8 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-36 font-bold text-foreground tracking-tightest mb-4">
              Explore by <span className="text-brand-blue">Feature</span>
            </h2>
            <p className="text-18 text-muted-foreground max-w-2xl mx-auto font-medium">
              Dive into detailed guides for every corner of the SOP-Guard Pro ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(feature => (
              <Link
                key={feature.id}
                href={feature.href}
                className="group relative bg-card border border-border/60 rounded-3xl p-8 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] hover:border-brand-blue/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center text-brand-blue group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors duration-300">
                    <feature.icon size={22} />
                  </div>
                  {feature.badge && (
                    <span className={cn(
                      "text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest shadow-sm",
                      feature.badge === 'QA' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    )}>
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-20 font-bold text-foreground group-hover:text-brand-blue transition-colors tracking-tight mb-3">
                  {feature.title}
                </h3>
                <p className="text-15 text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors flex-1">
                  {feature.description}
                </p>
                <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between">
                  <span className="text-13 font-bold text-brand-blue flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Documentation <ChevronRight size={14} />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Help Footer */}
      <section className="bg-background border-t border-border py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-blue/5 blur-[120px] rounded-full -z-10" />
        <div className="max-w-3xl mx-auto px-6 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-12 font-bold uppercase tracking-widest mb-6 border border-brand-blue/20">
            <MessageSquare size={14} />
            Support Center
          </div>
          <h4 className="text-32 font-bold text-foreground mb-4 tracking-tightest">Still have questions?</h4>
          <p className="text-muted-foreground mb-10 text-18 font-medium max-w-xl mx-auto leading-relaxed">
            Our specialized support team is here to help you configure SOP-Guard Pro for your specific operational needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@sopguard.com"
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-brand-navy dark:bg-brand-teal text-white font-bold hover:bg-brand-blue hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-soft"
            >
              Email Support
            </a>
            <Link
              href="/docs/getting-started/quickstart"
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-background text-foreground border border-border font-bold hover:bg-muted transition-all duration-300"
            >
              Open Ticket
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
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
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

"use client"
import React from 'react'
import Link from 'next/link'
import {
  BookOpen, Shield, ClipboardCheck, GitBranch, Cog, CalendarDays,
  BarChart2, MessageSquare, Settings, ChevronRight, FileText,
  BookmarkCheck, ArrowRight, Zap, Users, Database, Lock
} from 'lucide-react'
import { Search as DocsSearch } from '@/components/docs'
import { cn } from '@/lib/utils/cn'

/* ═══════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const GETTING_STARTED = [
  { title: 'What is SOP-Guard Pro?', href: '/docs/getting-started/introduction' },
  { title: 'Quickstart Guide', href: '/docs/getting-started/quickstart' },
  { title: 'Completing Your Onboarding', href: '/docs/getting-started/onboarding' },
  { title: 'Understanding Your Role', href: '/docs/getting-started/understanding-your-role' },
]

const POPULAR_ARTICLES = [
  { title: 'Role Permissions Matrix', href: '/docs/reference/role-permissions-matrix' },
  { title: 'SOP Status Reference', href: '/docs/reference/sop-status-reference' },
  { title: 'Approval Workflows', href: '/docs/approvals/approval-workflows' },
  { title: 'Your Digital Signature', href: '/docs/settings/your-signature' },
  { title: 'Keyboard Shortcuts', href: '/docs/reference/keyboard-shortcuts' },
  { title: 'Glossary', href: '/docs/reference/glossary' },
]

const DIRECTORY: CategoryBlock[] = [
  {
    category: "Compliance & Document Control",
    modules: [
      {
        id: 'sop-library', icon: BookOpen, title: 'SOP Library',
        desc: 'Read, search, acknowledge, and submit SOPs.',
        links: [
          { label: 'Overview', href: '/docs/sop-library/overview' },
          { label: 'Reading SOPs', href: '/docs/sop-library/reading-sops' },
          { label: 'Acknowledging a SOP', href: '/docs/sop-library/acknowledging-sops' },
          { label: 'Submitting for Approval', href: '/docs/sop-library/submitting-sops' },
          { label: 'Searching Cross-Department', href: '/docs/sop-library/searching-cross-department' },
          { label: 'Version History', href: '/docs/sop-library/version-history' },
        ]
      },
      {
        id: 'approvals', icon: ClipboardCheck, title: 'QA Approvals', badge: 'QA',
        desc: 'Review submissions, request changes, and activate documents.',
        links: [
          { label: 'Overview', href: '/docs/approvals/overview' },
          { label: 'Reviewing a Submission', href: '/docs/approvals/reviewing-a-submission' },
          { label: 'Requesting Changes', href: '/docs/approvals/requesting-changes' },
          { label: 'Approval Workflows', href: '/docs/approvals/approval-workflows' },
          { label: 'Approving & Activating', href: '/docs/approvals/approving-and-activating' },
        ]
      },
      {
        id: 'change-control', icon: GitBranch, title: 'Change Control',
        desc: 'Manage versioned changes with digital signatures.',
        links: [
          { label: 'Overview', href: '/docs/change-control/overview' },
          { label: 'Understanding the Diff', href: '/docs/change-control/understanding-the-diff' },
          { label: 'Signing a Change Control', href: '/docs/change-control/signing-a-change-control' },
          { label: 'Waiving a Signature', href: '/docs/change-control/signature-waiver' },
          { label: 'Deadlines & Escalation', href: '/docs/change-control/deadlines-and-escalation' },
        ]
      },
    ]
  },
  {
    category: "Operations & Analytics",
    modules: [
      {
        id: 'equipment', icon: Cog, title: 'Equipment & PM',
        desc: 'Track assets and schedule preventive maintenance.',
        links: [
          { label: 'Overview', href: '/docs/equipment/overview' },
          { label: 'Adding Equipment', href: '/docs/equipment/adding-equipment' },
          { label: 'Asset Detail Page', href: '/docs/equipment/asset-detail' },
          { label: 'Logging PM Completion', href: '/docs/equipment/logging-pm-completion' },
          { label: 'Reassigning Tasks', href: '/docs/equipment/reassigning-tasks' },
        ]
      },
      {
        id: 'reports', icon: BarChart2, title: 'Reports & Logs',
        desc: 'Audit trails, compliance logs, and AI-powered insights.',
        links: [
          { label: 'Overview', href: '/docs/reports/overview' },
          { label: 'SOP Change History', href: '/docs/reports/sop-change-history' },
          { label: 'Acknowledgement Log', href: '/docs/reports/acknowledgement-log' },
          { label: 'PM Completion Log', href: '/docs/reports/pm-completion-log' },
          { label: 'Notice Log', href: '/docs/reports/notice-log' },
          { label: 'AI Risk Insights', href: '/docs/reports/ai-risk-insights' },
        ]
      },
      {
        id: 'calendar', icon: CalendarDays, title: 'Company Calendar',
        desc: 'View PM schedules, events, and team deadlines.',
        links: [
          { label: 'Overview', href: '/docs/calendar/overview' },
          { label: 'PM Dates on the Calendar', href: '/docs/calendar/pm-dates' },
          { label: 'Creating Events', href: '/docs/calendar/creating-events' },
        ]
      },
    ]
  },
  {
    category: "Communication & Administration",
    modules: [
      {
        id: 'the-pulse', icon: BookmarkCheck, title: 'The Pulse',
        desc: 'Real-time work feed, notices, and personal to-dos.',
        links: [
          { label: 'Overview', href: '/docs/the-pulse/overview' },
          { label: 'Notification Types', href: '/docs/the-pulse/notification-types' },
          { label: 'Sending Notices', href: '/docs/the-pulse/notices-and-replies' },
          { label: 'Personal To-Dos', href: '/docs/the-pulse/personal-todos' },
        ]
      },
      {
        id: 'messaging', icon: MessageSquare, title: 'Messaging',
        desc: 'Direct messages, group chats, and record references.',
        links: [
          { label: 'Overview', href: '/docs/messaging/overview' },
          { label: 'Direct Messages', href: '/docs/messaging/direct-messages' },
          { label: 'Group Conversations', href: '/docs/messaging/group-conversations' },
          { label: 'Mentioning Someone', href: '/docs/messaging/mentions' },
          { label: 'Referencing Records', href: '/docs/messaging/referencing-records' },
          { label: 'Notifications & Muting', href: '/docs/messaging/notifications-and-muting' },
        ]
      },
      {
        id: 'settings', icon: Settings, title: 'Settings & Admin', badge: 'Admin',
        desc: 'Profile, users, departments, and system configuration.',
        links: [
          { label: 'Your Profile', href: '/docs/settings/your-profile' },
          { label: 'Your Signature', href: '/docs/settings/your-signature' },
          { label: 'Notification Preferences', href: '/docs/settings/notification-preferences' },
          { label: 'Managing Departments', href: '/docs/settings/departments' },
          { label: 'Managing Users', href: '/docs/settings/user-management' },
          { label: 'Deactivating Users', href: '/docs/settings/deactivating-users' },
        ]
      },
    ]
  }
]

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface ModuleLink { label: string; href: string }
interface Module { id: string; icon: React.ElementType; title: string; desc: string; badge?: string; links: ModuleLink[] }
interface CategoryBlock { category: string; modules: Module[] }

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function DocsHomeContent() {
  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-14">

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <h1 className="text-[32px] md:text-[40px] font-extrabold text-foreground tracking-tight leading-[1.15] mb-3">
                SOP-Guard Pro Documentation
              </h1>
              <p className="text-[16px] text-muted-foreground max-w-lg leading-relaxed">
                Comprehensive guides for every feature, workflow, and administrative task. Find answers fast with search or browse by category below.
              </p>
            </div>
            <div className="w-full md:w-[360px] shrink-0">
              <DocsSearch variant="large" />
            </div>
          </div>

          {/* Two-column quick access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Getting Started */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={14} className="text-brand-teal" />
                Getting Started
              </h2>
              <div className="space-y-1">
                {GETTING_STARTED.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between py-2 px-3 -mx-3 rounded-md text-[14px] font-medium text-foreground hover:bg-muted/60 transition-colors group"
                  >
                    {link.title}
                    <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular Articles */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} className="text-brand-blue" />
                Popular Articles
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {POPULAR_ARTICLES.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="py-2 px-2 -mx-2 rounded-md text-[14px] font-medium text-foreground hover:bg-muted/60 transition-colors truncate"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><FileText size={13} /> <strong className="text-foreground">60+</strong> articles</span>
            <span className="flex items-center gap-1.5"><Database size={13} /> <strong className="text-foreground">12</strong> modules</span>
            <span className="flex items-center gap-1.5"><Users size={13} /> <strong className="text-foreground">4</strong> role tiers</span>
            <span className="flex items-center gap-1.5"><Lock size={13} /> <strong className="text-foreground">RLS</strong> secured</span>
          </div>
        </div>
      </section>

      {/* ── MODULE DIRECTORY ──────────────────────────────────────────── */}
      <section className="bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 space-y-16">
          {DIRECTORY.map(cat => (
            <div key={cat.category}>
              <h2 className="text-[20px] font-bold text-foreground tracking-tight mb-6 pb-3 border-b border-border">
                {cat.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {cat.modules.map(mod => (
                  <ModuleCard key={mod.id} module={mod} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ADMIN QUICK-ACCESS ────────────────────────────────────────── */}
      <section className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-[18px] font-bold text-foreground mb-1 flex items-center gap-2">
                <Shield size={18} className="text-purple-600 dark:text-purple-400" />
                Administrator Resources
              </h3>
              <p className="text-[14px] text-muted-foreground">
                First-time setup, role system internals, audit logs, and system health monitoring.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'First-Time Setup', href: '/docs/admin/first-setup' },
                { label: 'Role System', href: '/docs/admin/role-system-explained' },
                { label: 'Audit Logs', href: '/docs/admin/audit-log' },
                { label: 'System Health', href: '/docs/admin/system-health' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 border border-border rounded-lg text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h4 className="text-[16px] font-bold text-foreground mb-1">Can't find what you need?</h4>
            <p className="text-[14px] text-muted-foreground">
              Reach out to our support team for configuration help and troubleshooting.
            </p>
          </div>
          <a
            href="mailto:support@sopguard.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-[14px] font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <MessageSquare size={16} />
            Contact Support
          </a>
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function ModuleCard({ module }: { module: Module }) {
  const Icon = module.icon
  return (
    <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-brand-blue/40 transition-colors">
      {/* Header strip */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-brand-blue dark:text-brand-teal">
              <Icon size={18} />
            </div>
            <h3 className="text-[15px] font-bold text-foreground tracking-tight">{module.title}</h3>
          </div>
          {module.badge && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border",
              module.badge === 'QA'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
            )}>
              {module.badge}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{module.desc}</p>
      </div>

      {/* Links list */}
      <div className="border-t border-border bg-muted/20 px-5 py-3 flex-1">
        <div className="space-y-0.5">
          {module.links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 py-1.5 text-[13px] text-muted-foreground hover:text-brand-blue dark:hover:text-brand-teal font-medium transition-colors group"
            >
              <ChevronRight size={12} className="text-border group-hover:text-brand-blue dark:group-hover:text-brand-teal transition-colors shrink-0" />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

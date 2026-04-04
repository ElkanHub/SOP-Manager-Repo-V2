"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search as SearchIcon, ArrowUpRight, Menu, X, ChevronRight, Circle } from 'lucide-react'
import { Search } from '@/components/docs'
import { cn } from '@/lib/utils/cn'
import { ThemeToggle } from "@/components/theme-toggle"

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

  // Dynamic content structure derived from MDX files
  const pages = [
    { slug: "admin/audit-log", title: "Audit Logs", section: "admin", order: 5, role: "admin" },
    { slug: "admin/first-setup", title: "First-Time Setup", section: "admin", order: 2, role: "admin" },
    { slug: "admin/granting-admin-access", title: "Granting Admin Access", section: "admin", order: 4, role: "admin" },
    { slug: "admin/overview", title: "Admin Console Overview", section: "admin", order: 1, role: "admin" },
    { slug: "admin/role-system-explained", title: "Role System Explained", section: "admin", order: 3, role: "admin" },
    { slug: "admin/system-health", title: "System Health & Backups", section: "admin", order: 6, role: "admin" },
    { slug: "approvals/approval-workflows", title: "Approval Workflows", section: "approvals", order: 4, role: "qa" },
    { slug: "approvals/approving-and-activating", title: "Approving & Activating", section: "approvals", order: 5, role: "qa" },
    { slug: "approvals/overview", title: "QA Approvals Overview", section: "approvals", order: 1, role: "qa" },
    { slug: "approvals/requesting-changes", title: "Requesting Changes", section: "approvals", order: 3, role: "qa" },
    { slug: "approvals/reviewing-a-submission", title: "Reviewing a Submission", section: "approvals", order: 2, role: "qa" },
    { slug: "calendar/creating-events", title: "Creating Calendar Events", section: "calendar", order: 3, role: "all" },
    { slug: "calendar/overview", title: "Company Calendar", section: "calendar", order: 1, role: "all" },
    { slug: "calendar/pm-dates", title: "PM Dates on the Calendar", section: "calendar", order: 2, role: "all" },
    { slug: "change-control/deadlines-and-escalation", title: "Deadlines and Escalation", section: "change-control", order: 5, role: "all" },
    { slug: "change-control/overview", title: "Change Control Overview", section: "change-control", order: 1, role: "all" },
    { slug: "change-control/signature-waiver", title: "Waiving a Required Signature", section: "change-control", order: 4, role: "admin" },
    { slug: "change-control/signing-a-change-control", title: "Signing a Change Control", section: "change-control", order: 3, role: "manager" },
    { slug: "change-control/understanding-the-diff", title: "Understanding the Document Comparison", section: "change-control", order: 2, role: "all" },
    { slug: "equipment/adding-equipment", title: "Adding New Equipment", section: "equipment", order: 2, role: "manager" },
    { slug: "equipment/asset-detail", title: "Asset Detail Page", section: "equipment", order: 3, role: "all" },
    { slug: "equipment/logging-pm-completion", title: "Logging PM Completion", section: "equipment", order: 4, role: "all" },
    { slug: "equipment/overview", title: "Equipment Registry Overview", section: "equipment", order: 1, role: "all" },
    { slug: "equipment/reassigning-tasks", title: "Reassigning PM Tasks", section: "equipment", order: 5, role: "manager" },
    { slug: "getting-started/introduction", title: "What is SOP-Guard Pro?", section: "getting-started", order: 1, role: "all" },
    { slug: "getting-started/onboarding", title: "Completing Your Onboarding", section: "getting-started", order: 3, role: "all" },
    { slug: "getting-started/quickstart", title: "Quickstart Guide", section: "getting-started", order: 2, role: "all" },
    { slug: "getting-started/understanding-your-role", title: "Understanding Your Role and Permissions", section: "getting-started", order: 4, role: "all" },
    { slug: "messaging/direct-messages", title: "Direct Messages", section: "messaging", order: 2, role: "all" },
    { slug: "messaging/group-conversations", title: "Group Conversations", section: "messaging", order: 3, role: "all" },
    { slug: "messaging/mentions", title: "Mentioning Someone", section: "messaging", order: 4, role: "all" },
    { slug: "messaging/notifications-and-muting", title: "Message Notifications and Muting", section: "messaging", order: 6, role: "all" },
    { slug: "messaging/overview", title: "Messaging Overview", section: "messaging", order: 1, role: "all" },
    { slug: "messaging/referencing-records", title: "Referencing Records", section: "messaging", order: 5, role: "all" },
    { slug: "reference/glossary", title: "Glossary", section: "reference", order: 5, role: "all" },
    { slug: "reference/keyboard-shortcuts", title: "Keyboard Shortcuts", section: "reference", order: 4, role: "all" },
    { slug: "reference/pulse-item-types", title: "Pulse Item Types Reference", section: "reference", order: 3, role: "all" },
    { slug: "reference/role-permissions-matrix", title: "Role Permissions Matrix", section: "reference", order: 1, role: "all" },
    { slug: "reference/sop-status-reference", title: "SOP Status Reference", section: "reference", order: 2, role: "all" },
    { slug: "reports/acknowledgement-log", title: "Acknowledgement Log", section: "reports", order: 3, role: "all" },
    { slug: "reports/ai-risk-insights", title: "AI Risk Insights", section: "reports", order: 6, role: "qa" },
    { slug: "reports/notice-log", title: "Notice Log", section: "reports", order: 5, role: "admin" },
    { slug: "reports/overview", title: "Reports Overview", section: "reports", order: 1, role: "all" },
    { slug: "reports/pm-completion-log", title: "PM Completion Log", section: "reports", order: 4, role: "all" },
    { slug: "reports/sop-change-history", title: "SOP Change History", section: "reports", order: 2, role: "all" },
    { slug: "settings/deactivating-users", title: "Deactivating and Reactivating Users", section: "settings", order: 6, role: "admin" },
    { slug: "settings/departments", title: "Managing Departments", section: "settings", order: 4, role: "admin" },
    { slug: "settings/notification-preferences", title: "Notification Preferences", section: "settings", order: 3, role: "all" },
    { slug: "settings/user-management", title: "Managing Users", section: "settings", order: 5, role: "admin" },
    { slug: "settings/your-profile", title: "Editing Your Profile", section: "settings", order: 1, role: "all" },
    { slug: "settings/your-signature", title: "Your Digital Signature", section: "settings", order: 2, role: "all" },
    { slug: "sop-library/acknowledging-sops", title: "Acknowledging a SOP", section: "sop-library", order: 3, role: "all" },
    { slug: "sop-library/overview", title: "SOP Library Overview", section: "sop-library", order: 1, role: "all" },
    { slug: "sop-library/reading-sops", title: "Reading SOPs", section: "sop-library", order: 2, role: "all" },
    { slug: "sop-library/searching-cross-department", title: "Searching Across Departments", section: "sop-library", order: 4, role: "all" },
    { slug: "sop-library/submitting-sops", title: "Submitting a SOP for Approval", section: "sop-library", order: 5, role: "manager" },
    { slug: "sop-library/version-history", title: "Viewing Version History", section: "sop-library", order: 6, role: "all" },
    { slug: "the-pulse/notices-and-replies", title: "Sending Notices and Replying", section: "the-pulse", order: 3, role: "all" },
    { slug: "the-pulse/notification-types", title: "Notification Types in the Pulse", section: "the-pulse", order: 2, role: "all" },
    { slug: "the-pulse/overview", title: "The Pulse — Your Work Feed", section: "the-pulse", order: 1, role: "all" },
    { slug: "the-pulse/personal-todos", title: "Personal To-Dos", section: "the-pulse", order: 4, role: "all" }
  ]

  // Filter pages and sections by role
  const filteredPages = pages.filter(page => {
    if (selectedRole === 'All') return true
    if (page.role === 'all') return true
    return page.role.toLowerCase() === selectedRole.toLowerCase()
  })

  const visibleSections = SECTIONS.filter(section =>
    filteredPages.some(page => page.section === section.id)
  )

  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check session on mount
    const checkUser = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
      } catch (err) {
        console.error('Error checking auth:', err)
      }
    }
    checkUser()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
      {/* TopBar */}
      <header className="h-[60px] fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/docs" className="group flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-navy rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-soft group-hover:bg-brand-blue transition-colors">S</div>
            <div>
              <span className="text-14 font-bold text-foreground tracking-tight block leading-none">SOP-GUARD PRO</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-[0.05em] uppercase">Knowledge Base</span>
            </div>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-12 relative group justify-center">
          <Search />
        </div>

        <div className="flex items-center gap-6">
          <Link href="/" className="hidden sm:flex items-center text-sm font-medium text-brand-blue hover:text-brand-navy dark:hover:text-brand-teal transition-colors gap-1.5">
            {user ? 'Go to Dashboard' : 'Sign In'} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        {/* theme toggle */}
        <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 pt-[60px]">
        {/* Sidebar */}
        {!isHome && (
          <aside className={cn(
            "fixed inset-0 top-[60px] z-40 md:sticky md:block w-[280px] bg-background border-r border-border/60 h-[calc(100vh-60px)] overflow-y-auto px-5 py-8 transition-transform md:translate-x-0 shadow-sm",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="mb-10 bg-muted/30 rounded-2xl p-4 border border-border/40">
              <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest block mb-3 pl-1">Target Persona</span>
              <div className="flex flex-wrap gap-1.5 font-sans">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "text-[10px] px-3 py-1.5 rounded-lg border font-semibold transition-all shadow-sm",
                      selectedRole === role
                        ? "bg-brand-navy text-white border-brand-navy dark:bg-brand-teal dark:border-brand-teal"
                        : "bg-background text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-700 hover:bg-muted"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <nav className="space-y-9">
              {visibleSections.map(section => (
                <div key={section.id}>
                  <h3 className="flex items-center gap-2 px-1 mb-3 text-[10px] uppercase font-bold text-muted-foreground tracking-[0.15em]">
                    {section.label}
                    {section.badge === 'QA' && (
                      <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded border border-blue-200/20 font-bold ml-1 uppercase leading-none">QA</span>
                    )}
                    {section.badge === 'Admin' && (
                      <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] px-1.5 py-0.5 rounded border border-purple-200/20 font-bold ml-1 uppercase leading-none">Admin</span>
                    )}
                  </h3>
                  <div className="space-y-1">
                    {filteredPages
                      .filter(p => p.section === section.id)
                      .sort((a, b) => a.order - b.order)
                      .map(page => (
                        <Link
                          key={page.slug}
                          href={`/docs/${page.slug}`}
                          className={cn(
                            "flex items-center h-[34px] px-3 rounded-xl text-sm transition-all group relative",
                            pathname === `/docs/${page.slug}`
                              ? "bg-brand-blue/10 text-brand-blue font-semibold border border-brand-blue/20 shadow-sm"
                              : "text-muted-foreground hover:text-foreground border border-transparent hover:bg-muted/50"
                          )}
                        >
                          {pathname === `/docs/${page.slug}` && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-teal rounded-r-full" />
                          )}
                          <span className={cn(
                            "transition-transform",
                            pathname === `/docs/${page.slug}` ? "translate-x-1" : "group-hover:translate-x-0.5"
                          )}>
                            {page.title}
                          </span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        )}

        <main className={cn(
          "flex-1 overflow-y-auto bg-background/50",
          isHome ? "w-full" : "max-w-4xl mx-auto px-10 md:px-16 py-12 lg:py-16"
        )}>
          {children}
        </main>

        {/* On-page nav (ToC) */}
        {!isHome && (
          <aside className="hidden xl:block w-[240px] sticky top-[80px] h-fit px-6 pt-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-5 block">On this page</span>
            <div id="table-of-contents" className="space-y-1 text-muted-foreground">
              {/* This is populated dynamically by TableOfHeaders */}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

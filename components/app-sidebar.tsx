"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, BookOpen, Wrench, Calendar, FileBarChart, Settings, ClipboardCheck, MessageSquare, ClipboardList, GraduationCap, Dumbbell, Sparkles, ChevronDown, ListTree, Bot, Send, Archive, SlidersHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"
import { clearAppBadgeSource, publishAppBadgeSource } from "@/lib/pwa/app-badge"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types/app.types"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
  profile: Profile;
  isQa?: boolean;
}

type ConversationBadgeRow = {
  last_message_at: string | null
  conversation_members: { last_read_at: string | null }[]
}

type ApprovalBadgeRow = {
  approval_stage: string | null
  sops?: { status?: string | null } | { status?: string | null }[] | null
}

type NavSubItem = {
  title: string
  url: string
  badge?: number
}

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  isActive: boolean
  badge?: number
  submenu?: NavSubItem[]
}

export function AppSidebar({ user, profile, isQa = false, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [unreadConversations, setUnreadConversations] = React.useState(0)
  const [pendingApprovals, setPendingApprovals] = React.useState(0)
  const [pendingEquipmentCount, setPendingEquipmentCount] = React.useState(0)
  const [pendingRequests, setPendingRequests] = React.useState(0)
  const [pendingHubSubmissions, setPendingHubSubmissions] = React.useState(0)
  const [pendingChangeControls, setPendingChangeControls] = React.useState(0)
  const [pendingHubChangeControls, setPendingHubChangeControls] = React.useState(0)
  const [pendingTraining, setPendingTraining] = React.useState(0)
  const [reviewModules, setReviewModules] = React.useState(0)
  const [libraryOpen, setLibraryOpen] = React.useState(pathname.startsWith("/library"))
  const [requestsOpen, setRequestsOpen] = React.useState(pathname.startsWith("/requests") && !pathname.startsWith("/requests/hub"))
  const [requestHubOpen, setRequestHubOpen] = React.useState(pathname.startsWith("/requests/hub"))
  const supabase = createClient()

  const prevUnreadRef = React.useRef(0)

  // Sound notification effect
  React.useEffect(() => {
    // Check if unreadCount increased and sound is enabled
    if (unreadConversations > prevUnreadRef.current) {
      const soundEnabled = profile?.notification_prefs?.message_sound
      const shouldPlay = soundEnabled && (document.hidden || !pathname.startsWith('/messages'))

      if (shouldPlay) {
        const audio = new Audio('/sounds/mixkit-bubble-pop-up-alert-notification-2357.wav')
        audio.play().catch(err => console.log('Audio playback prevented:', err))
      }
    }
    prevUnreadRef.current = unreadConversations
  }, [unreadConversations, profile?.notification_prefs?.message_sound, pathname])

  const fetchCounts = React.useCallback(async () => {
    if (!user) return

    // 1. Unread Messages
    const { data: convData } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message_at,
        conversation_members!inner(last_read_at)
      `)
      .eq('conversation_members.user_id', user.id)
      .eq('is_archived', false)

    if (convData) {
      const count = (convData as ConversationBadgeRow[]).filter((c) => {
        const myMember = c.conversation_members[0];
        return c.last_message_at && myMember?.last_read_at
          ? new Date(c.last_message_at) > new Date(myMember.last_read_at)
          : false;
      }).length;
      setUnreadConversations(count);
    }

    // 2. Pending Approvals (SOPs)
    if (isQa) {
      const { data: approvalRows } = await supabase
        .from('sop_approval_requests')
        .select('id, approval_stage, sops(status)')
        .eq('status', 'pending')

      const approvalCount = ((approvalRows || []) as ApprovalBadgeRow[]).filter((request) => {
        const sop = Array.isArray(request.sops) ? request.sops[0] : request.sops
        const stage = request.approval_stage || (sop?.status === 'pending_hod' ? 'hod_review' : 'qa_review')
        return stage === 'qa_review' || (!request.approval_stage && sop?.status === 'pending_qa')
      }).length

      setPendingApprovals(approvalCount)
    }

    // 3. Pending Equipment (Awaiting QA)
    let equipCount = 0
    if (isQa) {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_qa')
      equipCount = count || 0
    } else if (profile?.role === 'manager') {
      const { count } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_qa')
        .eq('department', profile.department)
      equipCount = count || 0
    }
    setPendingEquipmentCount(equipCount)

    const openChangeControlStatuses = [
      'submitted',
      'qa_screening',
      'clarification_requested',
      'approved_for_document_work',
      'documents_in_review',
      'signatures_pending',
      'pending_reconciliation',
      'pending_training',
    ]

    // 4. Pending Requests badge (new + legacy tables + Change Control packages)
    if (isQa || profile?.is_admin) {
      const [{ count: rfsCount }, { count: legacyCount }, { count: ccCount }] = await Promise.all([
        supabase
          .from('request_form_submissions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'received']),
        supabase
          .from('document_requests')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'received', 'approved']),
        supabase
          .from('change_controls')
          .select('*', { count: 'exact', head: true })
          .in('status', openChangeControlStatuses),
      ])
      setPendingRequests((rfsCount || 0) + (legacyCount || 0) + (ccCount || 0))
      setPendingHubSubmissions(rfsCount || 0)
      setPendingChangeControls(ccCount || 0)
      setPendingHubChangeControls(ccCount || 0)
    } else {
      const [{ count: rfsCount }, { count: legacyCount }, { count: ccCount }] = await Promise.all([
        supabase
          .from('request_form_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('requester_id', user.id)
          .in('status', ['submitted', 'received', 'approved']),
        supabase
          .from('document_requests')
          .select('*', { count: 'exact', head: true })
          .eq('requester_id', user.id)
          .in('status', ['submitted', 'received', 'approved']),
        supabase
          .from('change_controls')
          .select('*', { count: 'exact', head: true })
          .eq('requester_id', user.id)
          .in('status', openChangeControlStatuses),
      ])
      setPendingRequests((rfsCount || 0) + (legacyCount || 0) + (ccCount || 0))
      setPendingChangeControls(ccCount || 0)
    }

    // 5. Training
    const { count: trCount } = await supabase
      .from('training_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .neq('status', 'completed')
    setPendingTraining(trCount || 0)

    if (profile?.role === 'manager' || profile?.is_admin || isQa) {
      const { count: revCount } = await supabase
        .from('training_modules')
        .select('*', { count: 'exact', head: true })
        .eq('needs_review', true)
      setReviewModules(revCount || 0)
    }
  }, [user, supabase, isQa, profile])

  React.useEffect(() => {
    if (!user) return

    fetchCounts()

    // Realtime update for all badges
    const channel = supabase.channel('sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_approval_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_form_submissions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_controls' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_control_documents' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_assignments' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_modules' }, fetchCounts)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchCounts])

  React.useEffect(() => {
    if (pathname.startsWith("/library")) {
      setLibraryOpen(true)
    }
    if (pathname.startsWith("/requests") && !pathname.startsWith("/requests/hub")) {
      setRequestsOpen(true)
    }
    if (pathname.startsWith("/requests/hub")) {
      setRequestHubOpen(true)
    }
  }, [pathname])

  React.useEffect(() => {
    const sidebarTotal =
      unreadConversations +
      pendingApprovals +
      pendingEquipmentCount +
      pendingRequests +
      pendingTraining +
      reviewModules

    publishAppBadgeSource("sidebar", sidebarTotal)
    return () => clearAppBadgeSource("sidebar")
  }, [
    unreadConversations,
    pendingApprovals,
    pendingEquipmentCount,
    pendingRequests,
    pendingTraining,
    reviewModules,
  ])


  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      isActive: pathname === "/dashboard",
    },
    {
      title: "SOP Library",
      url: "/library",
      icon: <BookOpen className="w-5 h-5" />,
      isActive: pathname.startsWith("/library"),
    },
    {
      title: "Start a Request",
      url: "/intake",
      icon: <Send className="w-5 h-5" />,
      isActive: pathname.startsWith("/intake"),
    },
    ...(isQa ? [{
      title: "Approvals",
      url: "/approvals",
      icon: <ClipboardCheck className="w-5 h-5" />,
      isActive: pathname.startsWith("/approvals"),
      badge: pendingApprovals,
    }] : []),
    ...((profile?.role === 'manager' || profile?.is_admin || isQa) ? [{
      title: "AI SOP Builder",
      url: "/sop-builder",
      icon: <Bot className="w-5 h-5" />,
      isActive: pathname.startsWith("/sop-builder"),
    }] : []),
    {
      title: "My Training",
      url: "/training/my-training",
      icon: <Dumbbell className="w-5 h-5" />,
      isActive: pathname.startsWith("/training/my-training"),
      badge: pendingTraining,
    },
    ...((profile?.role === 'manager' || profile?.is_admin || isQa) ? [{
      title: "Training Hub",
      url: "/training",
      icon: <GraduationCap className="w-5 h-5" />,
      isActive: pathname.startsWith("/training") && !pathname.startsWith("/training/my-training"),
      badge: reviewModules,
    }] : []),
    {
      title: "Equipment",
      url: "/equipment",
      icon: <Wrench className="w-5 h-5" />,
      isActive: pathname.startsWith("/equipment"),
      badge: pendingEquipmentCount,
    },
    {
      title: "Messages",
      url: "/messages",
      icon: <MessageSquare className="w-5 h-5" />,
      isActive: pathname.startsWith("/messages"),
      badge: unreadConversations,
    },
    {
      title: "Requests",
      url: "/requests",
      icon: <ClipboardList className="w-5 h-5" />,
      isActive: pathname === "/requests" || (pathname.startsWith("/requests") && !pathname.startsWith("/requests/hub")),
      badge: pendingRequests,
      submenu: [
        { title: "Document Requests", url: "/requests", badge: Math.max(0, pendingRequests - pendingChangeControls) },
        { title: "Change Control", url: "/requests/change-control", badge: pendingChangeControls },
      ],
    },
    ...(isQa ? [{
      title: "Request Hub",
      url: "/requests/hub",
      icon: <Sparkles className="w-5 h-5" />,
      isActive: pathname.startsWith("/requests/hub"),
      badge: pendingHubSubmissions + pendingHubChangeControls,
      submenu: [
        { title: "Document Request Hub", url: "/requests/hub", badge: pendingHubSubmissions },
        { title: "Change Control Hub", url: "/requests/hub/change-control", badge: pendingHubChangeControls },
        { title: "Retirements", url: "/requests/hub/retirements" },
      ],
    }] : []),
    ...(isQa ? [{
      title: "Retirements",
      url: "/requests/retirements",
      icon: <Archive className="w-5 h-5" />,
      isActive: pathname.startsWith("/requests/retirements") || pathname.startsWith("/requests/hub/retirements"),
    }] : []),
    ...(isQa ? [{
      title: "Classification Matrix",
      url: "/settings/classification-matrix",
      icon: <SlidersHorizontal className="w-5 h-5" />,
      isActive: pathname.startsWith("/settings/classification-matrix"),
    }] : []),
    {
      title: "Calendar",
      url: "/calendar",
      icon: <Calendar className="w-5 h-5" />,
      isActive: pathname.startsWith("/calendar"),
    },
    ...(isQa || profile?.is_admin ? [{
      title: "Reports",
      url: "/reports",
      icon: <FileBarChart className="w-5 h-5" />,
      isActive: pathname.startsWith("/reports"),
    }] : []),
  ]

  return (
    <Sidebar collapsible="offcanvas" className="border-r pt-14" {...props}>
      <SidebarHeader className="bg-muted/50 p-4 border-b">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-foreground border-b pb-2 mb-1">
            Workspace
          </div>

        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 space-y-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.title === "SOP Library" ? (
                <>
                  <div className="flex items-center">
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={item.isActive}
                      className={`
                        flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-md transition-all duration-200 ease-in-out
                        md:text-sm text-base py-3 flex-1
                        ${item.isActive
                          ? "bg-brand-navy/5 text-brand-navy font-semibold border-l-4 border-brand-teal shadow-soft dark:bg-brand-teal/10 dark:text-brand-teal"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground border-l-4 border-transparent hover:translate-x-1"
                        }
                      `}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    <button
                      type="button"
                      onClick={() => setLibraryOpen((open) => !open)}
                      className="ml-1 flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                      aria-label="Toggle SOP Library submenu"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${libraryOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {libraryOpen && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/library/master-index" />}
                          isActive={pathname.startsWith("/library/master-index")}
                          className="gap-2"
                        >
                          <ListTree className="h-4 w-4" />
                          <span>Master Index</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </>
              ) : item.submenu ? (
                <>
                  <div className="flex items-center">
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={item.isActive}
                      className={`
                        flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-md transition-all duration-200 ease-in-out
                        md:text-sm text-base py-3 flex-1
                        ${item.isActive
                          ? "bg-brand-navy/5 text-brand-navy font-semibold border-l-4 border-brand-teal shadow-soft dark:bg-brand-teal/10 dark:text-brand-teal"
                          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground border-l-4 border-transparent hover:translate-x-1"
                        }
                      `}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge className="ml-auto bg-brand-teal text-white border-0 h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center text-[10px] font-bold">
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                    <button
                      type="button"
                      onClick={() => item.title === "Requests"
                        ? setRequestsOpen((open) => !open)
                        : setRequestHubOpen((open) => !open)
                      }
                      className="ml-1 flex h-9 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                      aria-label={`Toggle ${item.title} submenu`}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${(item.title === "Requests" ? requestsOpen : requestHubOpen) ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {(item.title === "Requests" ? requestsOpen : requestHubOpen) && (
                    <SidebarMenuSub>
                      {item.submenu.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={pathname === subItem.url}
                            className="gap-2"
                          >
                            <span>{subItem.title}</span>
                            {subItem.badge !== undefined && subItem.badge > 0 && (
                              <Badge className="ml-auto bg-brand-teal text-white border-0 h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center text-[10px] font-bold">
                                {subItem.badge > 99 ? '99+' : subItem.badge}
                              </Badge>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={item.isActive}
                  className={`
                    flex items-center gap-3 px-3 py-2 md:py-2.5 rounded-md transition-all duration-200 ease-in-out
                    md:text-sm text-base py-3
                    ${item.isActive
                    ? "bg-brand-navy/5 text-brand-navy font-semibold border-l-4 border-brand-teal shadow-soft dark:bg-brand-teal/10 dark:text-brand-teal"
                    : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground border-l-4 border-transparent hover:translate-x-1"
                  }
                  `}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge className="ml-auto bg-brand-teal text-white border-0 h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center text-[10px] font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2 space-y-4">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between">
            <SidebarMenuButton render={<Link href="/settings" className="flex items-center gap-3 px-3 py-3 md:py-2 flex-1 text-base md:text-sm" />} className="text-muted-foreground hover:bg-accent hover:text-foreground">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* User Mini Profile */}
        <div className="flex items-center gap-3">
          <UserAvatar name={profile?.full_name} image={profile?.avatar_url} size="lg" className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground line-clamp-1">{profile?.full_name}</span>
            <div className="flex gap-1 mt-0.5">
              <Badge variant="secondary" className="px-1.5 text-[10px] bg-brand-teal/10 text-brand-teal uppercase border-0">
                {profile?.department}
              </Badge>
              {profile?.role === 'manager' && (
                <Badge variant="outline" className="px-1.5 text-[10px] text-muted-foreground uppercase">Mgr</Badge>
              )}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

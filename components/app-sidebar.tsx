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
} from "@/components/ui/sidebar"
import { LayoutDashboard, BookOpen, Wrench, Calendar, FileBarChart, Settings, ClipboardCheck, LogOut, MessageSquare } from "lucide-react"
import { logoutUser } from "@/actions/auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: any;
  profile: any;
  isQa?: boolean;
}

export function AppSidebar({ user, profile, isQa = false, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [unreadConversations, setUnreadConversations] = React.useState(0)
  const supabase = createClient()

  React.useEffect(() => {
    if (!user) return

    async function fetchUnreadCount() {
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
        const count = convData.filter((c: any) => {
          const myMember = (c as any).conversation_members[0];
          return c.last_message_at && myMember?.last_read_at
            ? new Date(c.last_message_at) > new Date(myMember.last_read_at)
            : false;
        }).length;
        setUnreadConversations(count);
      }
    }

    fetchUnreadCount()

    // Realtime update for unread count
    const channel = supabase.channel('sidebar-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchUnreadCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id, supabase])

  const navItems = [
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
    ...(isQa ? [{
      title: "Approvals",
      url: "/approvals",
      icon: <ClipboardCheck className="w-5 h-5" />,
      isActive: pathname.startsWith("/approvals"),
    }] : []),
    {
      title: "Equipment",
      url: "/equipment",
      icon: <Wrench className="w-5 h-5" />,
      isActive: pathname.startsWith("/equipment"),
    },
    {
      title: "Messages",
      url: "/messages",
      icon: <MessageSquare className="w-5 h-5" />,
      isActive: pathname.startsWith("/messages"),
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: <Calendar className="w-5 h-5" />,
      isActive: pathname.startsWith("/calendar"),
    },
    {
      title: "Reports",
      url: "/reports",
      icon: <FileBarChart className="w-5 h-5" />,
      isActive: pathname.startsWith("/reports"),
    },
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
                {item.title === "Messages" && unreadConversations > 0 && (
                  <Badge className="ml-auto bg-brand-teal text-white border-0 h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center text-[10px]">
                    {unreadConversations}
                  </Badge>
                )}
              </SidebarMenuButton>
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

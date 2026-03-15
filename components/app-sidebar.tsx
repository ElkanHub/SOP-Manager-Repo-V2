"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, BookOpen, Wrench, Calendar, FileBarChart, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: any;
  profile: any;
}

export function AppSidebar({ user, profile, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      isActive: pathname === "/dashboard",
    },
    {
      title: "SOP Library",
      url: "/sops",
      icon: <BookOpen className="w-5 h-5" />,
      isActive: pathname.startsWith("/sops"),
    },
    {
      title: "Equipment",
      url: "/equipment",
      icon: <Wrench className="w-5 h-5" />,
      isActive: pathname.startsWith("/equipment"),
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
      <SidebarHeader className="bg-slate-50/50 p-4 border-b">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-slate-900 border-b pb-2 mb-1">
            Workspace
          </div>
          
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 space-y-1 bg-white">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<a href={item.url} />}
                isActive={item.isActive}
                className={`
                                    flex items-center gap-3 px-3 py-2 rounded-md transition-colors
                                    ${item.isActive
                    ? "bg-brand-navy/5 text-brand-navy font-medium border-l-[3px] border-brand-teal"
                    : "text-slate-600 hover:bg-slate-100 border-l-[3px] border-transparent"
                  }
                                `}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2 bg-slate-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/settings" className="flex items-center gap-3 px-3 py-2" />} className="text-slate-600 hover:bg-slate-200">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* User Mini Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-navy flex items-center justify-center text-white overflow-hidden shadow-sm">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">{profile?.full_name?.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 line-clamp-1">{profile?.full_name}</span>
              <div className="flex gap-1 mt-0.5">
                <Badge variant="secondary" className="px-1.5 text-[10px] bg-brand-teal/10 text-brand-teal uppercase border-0">
                  {profile?.department}
                </Badge>
                {profile?.role === 'manager' && (
                  <Badge variant="outline" className="px-1.5 text-[10px] text-slate-500 uppercase">Mgr</Badge>
                )}
              </div>
            </div>
          </div>
      </SidebarFooter>
    </Sidebar>
  )
}

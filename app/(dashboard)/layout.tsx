import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNav } from "@/components/shell/top-nav"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThePulse } from "@/components/pulse/the-pulse"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        redirect('/login?reason=inactive')
    }

    if (!profile?.onboarding_complete) {
        redirect('/onboarding')
    }

    const serviceClient = await createServiceClient()
    const { data: isQa } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })

    return (
        <SidebarProvider>
            <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
                <TopNav user={user} profile={profile} />

                <div className="flex flex-1 overflow-hidden">
                    <AppSidebar user={user} profile={profile} isQa={isQa || false} />

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative z-10 bg-background">
                        {children}
                    </main>

                    {/* The Pulse Right Sidebar */}
                    <ThePulse profile={profile} user={user} />
                </div>
            </div>
        </SidebarProvider>
    )
}

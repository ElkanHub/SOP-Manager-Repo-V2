import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
    return (
        <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Welcome to your Dashboard</h1>
            <p>Phase 9 will implement the KPI and reporting dashboard here.</p>
        </div>
    )
}
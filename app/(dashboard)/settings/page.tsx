import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex flex-col h-full items-start justify-start text-muted-foreground p-6">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Settings</h1>
            <p>Phase 11 will implement the Settings & Admin section here.</p>
        </div>
    )
}

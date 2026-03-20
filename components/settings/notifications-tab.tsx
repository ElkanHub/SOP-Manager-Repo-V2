"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, Loader2 } from "lucide-react"
import { updateNotificationPrefs } from "@/actions/settings"

interface NotifPrefs {
    email: boolean
    pulse: boolean
}

interface NotificationsTabProps {
    initialPrefs: NotifPrefs
}

export function NotificationsTab({ initialPrefs }: NotificationsTabProps) {
    const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs)
    const [saving, setSaving] = useState<null | 'email' | 'pulse'>(null)
    const [error, setError] = useState<string | null>(null)

    async function toggle(key: keyof NotifPrefs) {
        const next = { ...prefs, [key]: !prefs[key] }
        setPrefs(next)
        setSaving(key)
        setError(null)
        const result = await updateNotificationPrefs(next)
        setSaving(null)
        if (!result.success) {
            setPrefs(prefs) // revert
            setError(result.error)
        }
    }

    return (
        <div className="space-y-6 max-w-xl">
            <p className="text-sm text-muted-foreground">Control how you receive notifications from SOP-Guard Pro.</p>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <Label htmlFor="notif-email" className="font-medium cursor-pointer">Email Notifications</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Receive important updates via email</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saving === 'email' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id="notif-email"
                            checked={prefs.email}
                            onCheckedChange={() => toggle('email')}
                            disabled={saving !== null}
                        />
                    </div>
                </div>

                {/* Pulse Notifications */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <Label htmlFor="notif-pulse" className="font-medium cursor-pointer">Pulse In-App Notifications</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Receive alerts via the Pulse panel</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saving === 'pulse' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id="notif-pulse"
                            checked={prefs.pulse}
                            onCheckedChange={() => toggle('pulse')}
                            disabled={saving !== null}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

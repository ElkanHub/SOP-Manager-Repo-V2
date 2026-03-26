"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, Loader2 } from "lucide-react"
import { updateNotificationPrefs } from "@/actions/settings"

interface NotifPrefs {
    email: boolean
    pulse: boolean
    notice_sound: boolean
    message_sound: boolean
}

interface NotificationsTabProps {
    initialPrefs: NotifPrefs
}

export function NotificationsTab({ initialPrefs }: NotificationsTabProps) {
    const defaultPrefs: NotifPrefs = {
        email: initialPrefs.email ?? true,
        pulse: initialPrefs.pulse ?? true,
        notice_sound: initialPrefs.notice_sound ?? true,
        message_sound: initialPrefs.message_sound ?? true
    }
    const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs)
    const [saving, setSaving] = useState<null | keyof NotifPrefs>(null)
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
            <p className="text-sm text-muted-foreground">Control how you receive notifications and alerts from SOP-Guard Pro.</p>

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
                            <Label htmlFor="notif-pulse" className="font-medium cursor-pointer">Pulse Panel Alerts</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Show notifications in the side panel</p>
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

                <div className="pt-2">
                    <h3 className="text-sm font-semibold mb-3 text-foreground/70 px-1">Sound Preferences</h3>
                    <div className="space-y-3">
                        {/* Notice Sound */}
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-4 gap-4">
                            <div>
                                <Label htmlFor="notif-notice-sound" className="font-medium cursor-pointer">Notice Chime</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Play a sound for new broadcast notices</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 rounded-full hover:bg-brand-teal/10 hover:text-brand-teal"
                                    onClick={() => {
                                        const audio = new Audio('/sounds/mixkit-double-beep-tone-alert-2868.wav');
                                        audio.volume = 0.5;
                                        audio.play().catch(() => {});
                                    }}
                                    title="Test Sound"
                                >
                                    <Bell className="h-3 w-3" />
                                </Button>
                                {saving === 'notice_sound' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                <Switch
                                    id="notif-notice-sound"
                                    checked={prefs.notice_sound}
                                    onCheckedChange={() => toggle('notice_sound')}
                                    disabled={saving !== null}
                                />
                            </div>
                        </div>

                        {/* Message Sound */}
                        <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-4 gap-4">
                            <div>
                                <Label htmlFor="notif-message-sound" className="font-medium cursor-pointer">Message Pop</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Play a sound for new direct messages</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 rounded-full hover:bg-blue-600/10 hover:text-blue-600"
                                    onClick={() => {
                                        const audio = new Audio('/sounds/mixkit-correct-answer-tone-2870.wav');
                                        audio.volume = 0.5;
                                        audio.play().catch(() => {});
                                    }}
                                    title="Test Sound"
                                >
                                    <Mail className="h-3 w-3" />
                                </Button>
                                {saving === 'message_sound' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                <Switch
                                    id="notif-message-sound"
                                    checked={prefs.message_sound}
                                    onCheckedChange={() => toggle('message_sound')}
                                    disabled={saving !== null}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

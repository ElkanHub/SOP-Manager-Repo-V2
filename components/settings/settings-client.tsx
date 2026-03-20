"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Bell, Building2, Users } from "lucide-react"
import { ProfileTab } from "./profile-tab"
import { NotificationsTab } from "./notifications-tab"
import { DepartmentsTab } from "./departments-tab"
import { UsersTab } from "./users-tab"
import type { Profile, Department } from "@/types/app.types"

interface NotifPrefs {
    email: boolean
    pulse: boolean
}

interface ProfileWithEmail extends Profile {
    email?: string
}

interface SettingsClientProps {
    profile: Profile
    isAdmin: boolean
    departments: Department[]
    users: ProfileWithEmail[]
    currentUserId: string
}

export function SettingsClient({
    profile,
    isAdmin,
    departments,
    users,
    currentUserId,
}: SettingsClientProps) {
    const rawPrefs = profile.notification_prefs
    const notifPrefs: NotifPrefs = {
        email: typeof rawPrefs?.email === 'boolean' ? rawPrefs.email : true,
        pulse: typeof rawPrefs?.pulse === 'boolean' ? rawPrefs.pulse : true,
    }

    return (
        <div className="flex flex-col h-full p-6 max-w-5xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your profile, notifications, and account preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="flex-1">
                <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="profile" className="gap-2 rounded-lg">
                        <User className="w-4 h-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2 rounded-lg">
                        <Bell className="w-4 h-4" /> Notifications
                    </TabsTrigger>
                    {isAdmin && (
                        <>
                            <TabsTrigger value="departments" className="gap-2 rounded-lg">
                                <Building2 className="w-4 h-4" /> Departments
                            </TabsTrigger>
                            <TabsTrigger value="users" className="gap-2 rounded-lg">
                                <Users className="w-4 h-4" /> Users
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                    <ProfileTab profile={profile} />
                </TabsContent>

                <TabsContent value="notifications" className="mt-0">
                    <NotificationsTab initialPrefs={notifPrefs} />
                </TabsContent>

                {isAdmin && (
                    <>
                        <TabsContent value="departments" className="mt-0">
                            <DepartmentsTab initialDepts={departments} />
                        </TabsContent>
                        <TabsContent value="users" className="mt-0 overflow-x-auto">
                            <UsersTab
                                users={users}
                                departments={departments}
                                currentUserId={currentUserId}
                            />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    )
}

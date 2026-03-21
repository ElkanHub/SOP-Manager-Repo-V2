"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    ShieldCheck, ShieldOff, UserCheck, UserX, ChevronDown, User, Loader2,
} from "lucide-react"
import { PasswordConfirmModal } from "./password-confirm-modal"
import {
    changeUserRole, changeUserDepartment, grantAdmin, revokeAdmin, deactivateUser, reactivateUser
} from "@/actions/settings"
import type { Profile, Department } from "@/types/app.types"

interface ProfileWithEmail extends Profile {
    email?: string
}

interface UsersTabProps {
    users: ProfileWithEmail[]
    departments: Department[]
    currentUserId: string
}

function UserAvatar({ profile }: { profile: ProfileWithEmail }) {
    const initials = profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    return profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.full_name} className="w-9 h-9 rounded-xl object-cover border border-border/40 shadow-sm" />
    ) : (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-navy/10 text-brand-teal flex items-center justify-center text-xs font-bold border border-brand-teal/10 shadow-sm">
            {initials}
        </div>
    )
}

function UserRow({
    user,
    departments,
    currentUserId,
    onUpdate,
}: {
    user: ProfileWithEmail
    departments: Department[]
    currentUserId: string
    onUpdate: (id: string, patch: Partial<ProfileWithEmail>) => void
}) {
    const isSelf = user.id === currentUserId
    const [isPending, startTransition] = useTransition()

    // Admin modal states
    const [grantOpen, setGrantOpen] = useState(false)
    const [revokeOpen, setRevokeOpen] = useState(false)

    // Deactivate confirm
    const [deactivateOpen, setDeactivateOpen] = useState(false)
    const [deactivateError, setDeactivateError] = useState<string | null>(null)
    const [deactivating, setDeactivating] = useState(false)

    function handleRoleChange(newRole: string | null) {
        if (!newRole) return
        startTransition(async () => {
            const result = await changeUserRole(user.id, newRole as 'manager' | 'employee')
            if (result.success) onUpdate(user.id, { role: newRole as 'manager' | 'employee' })
        })
    }

    function handleDeptChange(newDept: string | null) {
        if (!newDept) return
        startTransition(async () => {
            const result = await changeUserDepartment(user.id, newDept)
            if (result.success) onUpdate(user.id, { department: newDept })
        })
    }

    async function handleDeactivate() {
        setDeactivating(true)
        setDeactivateError(null)
        const result = await deactivateUser(user.id)
        setDeactivating(false)
        if (!result.success) { setDeactivateError(result.error); return }
        onUpdate(user.id, { is_active: false })
        setDeactivateOpen(false)
    }

    async function handleReactivate() {
        startTransition(async () => {
            const result = await reactivateUser(user.id)
            if (result.success) onUpdate(user.id, { is_active: true })
        })
    }

    return (
        <tr className="bg-background hover:bg-muted/30 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                    <UserAvatar profile={user} />
                    <div className="space-y-0.5">
                        <p className="font-bold text-foreground text-sm tracking-tight">{user.full_name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{user.email ?? user.job_title}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                {isSelf ? (
                    <span className="text-sm text-muted-foreground">{user.department}</span>
                ) : (
                    <Select value={user.department} onValueChange={handleDeptChange} disabled={isPending}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map((d) => (
                                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </td>
            <td className="px-4 py-3">
                {isSelf ? (
                    <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                ) : (
                    <Select value={user.role} onValueChange={handleRoleChange} disabled={isPending}>
                        <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </td>
            <td className="px-4 py-3">
                {user.is_admin ? (
                    <Badge variant="outline" className="border-brand-teal text-brand-teal gap-1 text-xs">
                        <ShieldCheck className="w-3 h-3" /> Admin
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">User</Badge>
                )}
            </td>
            <td className="px-4 py-3">
                {user.is_active ? (
                    <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 text-xs">Active</Badge>
                ) : (
                    <Badge variant="outline" className="border-red-400 text-red-500 text-xs">Inactive</Badge>
                )}
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
            </td>
            <td className="px-4 py-3">
                {!isSelf && (
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                        {/* Grant / Revoke Admin */}
                        {user.is_admin ? (
                            <Button
                                variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                onClick={() => setRevokeOpen(true)}
                                aria-label={`Revoke admin from ${user.full_name}`}
                            >
                                <ShieldOff className="w-3.5 h-3.5" /> Revoke Admin
                            </Button>
                        ) : (
                            <Button
                                variant="ghost" size="sm" className="h-7 text-xs gap-1 text-brand-teal hover:bg-teal-50 dark:hover:bg-teal-950/30"
                                onClick={() => setGrantOpen(true)}
                                aria-label={`Grant admin to ${user.full_name}`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Grant Admin
                            </Button>
                        )}

                        {/* Deactivate / Reactivate */}
                        {user.is_active ? (
                            <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => { setDeactivateError(null); setDeactivateOpen(true) }}
                                disabled={isPending}
                                aria-label={`Deactivate ${user.full_name}`}
                            >
                                <UserX className="w-3.5 h-3.5" /> Deactivate
                            </Button>
                        ) : (
                            <Button
                                variant="ghost" size="sm"
                                className="h-7 text-xs gap-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={handleReactivate}
                                disabled={isPending}
                                aria-label={`Reactivate ${user.full_name}`}
                            >
                                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                                Reactivate
                            </Button>
                        )}
                    </div>
                )}

                {/* Grant Admin Modal */}
                <PasswordConfirmModal
                    open={grantOpen}
                    onClose={() => setGrantOpen(false)}
                    title="Grant Admin Access"
                    description={`You are granting admin access to ${user.full_name}. Enter your password to confirm.`}
                    confirmLabel="Grant Admin"
                    onConfirm={async (password) => {
                        const result = await grantAdmin(user.id, password)
                        if (result.success) onUpdate(user.id, { is_admin: true })
                        return result
                    }}
                />

                {/* Revoke Admin Modal */}
                <PasswordConfirmModal
                    open={revokeOpen}
                    onClose={() => setRevokeOpen(false)}
                    title="Revoke Admin Access"
                    description={`You are revoking admin access from ${user.full_name}. Enter your password to confirm.`}
                    confirmLabel="Revoke Admin"
                    onConfirm={async (password) => {
                        const result = await revokeAdmin(user.id, password)
                        if (result.success) onUpdate(user.id, { is_admin: false })
                        return result
                    }}
                />

                {/* Deactivate Confirm */}
                <AlertDialog open={deactivateOpen} onOpenChange={(v) => { if (!v) setDeactivateOpen(false) }}>
                    <AlertDialogContent className="p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
                        <AlertDialogHeader className="p-6 pb-4 bg-gradient-to-r from-red-500/10 via-brand-navy/5 to-transparent border-b border-border/50">
                            <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <UserX className="w-5 h-5 text-red-500" />
                                Deactivate Personnel
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold uppercase tracking-widest text-red-500/80">
                                System Access Restriction
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-6 py-4 space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                You are about to deactivate <span className="font-bold text-foreground">{user.full_name}</span>. This will immediately invalidate their active sessions and prevent future authentication.
                            </p>
                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
                                <ShieldOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-800/80 font-medium leading-relaxed uppercase tracking-wide">
                                    Historical records, audit logs, and SOP signatures will remain preserved for compliance purposes.
                                </p>
                            </div>
                            {deactivateError && (
                                <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg">{deactivateError}</p>
                            )}
                        </div>
                        <AlertDialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 flex flex-col-reverse sm:flex-row gap-3">
                            <AlertDialogCancel className="mt-0 border-none bg-transparent hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Abort</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeactivate}
                                disabled={deactivating}
                                className="bg-red-600 hover:bg-red-700 text-white shadow-lg font-bold px-8 rounded-lg"
                            >
                                {deactivating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                CONFIRM DEACTIVATION
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </td>
        </tr>
    )
}

export function UsersTab({ users: initialUsers, departments, currentUserId }: UsersTabProps) {
    const [users, setUsers] = useState<ProfileWithEmail[]>(initialUsers)
    const [inactiveOpen, setInactiveOpen] = useState(false)

    function handleUpdate(id: string, patch: Partial<ProfileWithEmail>) {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    }

    const active = users.filter((u) => u.is_active)
    const inactive = users.filter((u) => !u.is_active)

    const tableHeaders = (
        <thead className="bg-gradient-to-r from-brand-navy/5 via-brand-teal/5 to-transparent border-b border-border/50">
            <tr>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Personnel</th>
                <th className="text-left px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Department</th>
                <th className="text-left px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Role</th>
                <th className="text-left px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Governance</th>
                <th className="text-left px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Status</th>
                <th className="text-left px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Registration</th>
                <th className="px-6 py-4" />
            </tr>
        </thead>
    )
    )

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-foreground">Active Users</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{active.length} active user(s)</p>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[840px]">
                    {tableHeaders}
                    <tbody className="divide-y divide-border">
                        {active.map((user) => (
                            <UserRow key={user.id} user={user} departments={departments} currentUserId={currentUserId} onUpdate={handleUpdate} />
                        ))}
                    </tbody>
                </table>
                </div>
                {active.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">No active users.</div>
                )}
            </div>

            {/* Inactive Users Collapsible */}
            {inactive.length > 0 && (
                <Collapsible open={inactiveOpen} onOpenChange={setInactiveOpen}>
                    <CollapsibleTrigger className="inline-flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Inactive Users ({inactive.length})
                        <ChevronDown className={`w-4 h-4 transition-transform ${inactiveOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                        <div className="rounded-xl border border-border overflow-hidden opacity-80">
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[840px]">
                                {tableHeaders}
                                <tbody className="divide-y divide-border">
                                    {inactive.map((user) => (
                                        <UserRow key={user.id} user={user} departments={departments} currentUserId={currentUserId} onUpdate={handleUpdate} />
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    )
}

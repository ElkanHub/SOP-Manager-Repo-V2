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
    changeUserRole, changeUserDepartment, grantAdmin, revokeAdmin, deactivateUser, reactivateUser, approveUser, rejectUser
} from "@/actions/settings"
import type { Profile, Department } from "@/types/app.types"
import { UserAvatar } from "@/components/user-avatar"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface ProfileWithEmail extends Profile {
    email?: string
}

interface UsersTabProps {
    users: ProfileWithEmail[]
    departments: Department[]
    currentUserId: string
}

export function UsersTab({ users: initialUsers, departments, currentUserId }: UsersTabProps) {
    const [users, setUsers] = useState<ProfileWithEmail[]>(initialUsers)
    const [inactiveOpen, setInactiveOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    function handleUpdate(id: string, patch: Partial<ProfileWithEmail>) {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    }

    const activeUsers = users.filter((u) => u.is_active && u.signup_status !== 'pending')
    const inactiveUsers = users.filter((u) => !u.is_active && u.signup_status !== 'pending')
    const pendingUsers = users.filter((u) => u.signup_status === 'pending')

    const createColumns = (listType: 'active' | 'inactive' | 'pending'): ColumnDef<ProfileWithEmail>[] => [
        {
            accessorKey: "full_name",
            header: "Personnel",
            cell: ({ row }) => {
                const user = row.original
                return (
                    <div className="flex items-center gap-4">
                        <UserAvatar name={user.full_name} image={user.avatar_url} className="w-9 h-9 rounded-xl" />
                        <div className="space-y-0.5">
                            <p className="font-bold text-foreground text-sm tracking-tight">{user.full_name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{user.email ?? user.job_title}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "department",
            header: "Department",
            cell: ({ row }) => {
                const user = row.original
                const isSelf = user.id === currentUserId
                
                const handleDeptChange = (newDept: string | null) => {
                    if (!newDept) return
                    startTransition(async () => {
                        const result = await changeUserDepartment(user.id, newDept)
                        if (result.success) handleUpdate(user.id, { department: newDept })
                    })
                }

                if (isSelf) return <span className="text-sm text-muted-foreground">{user.department}</span>

                return (
                    <Select value={user.department ?? ""} onValueChange={handleDeptChange} disabled={isPending}>
                        <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map((d) => (
                                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            },
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const user = row.original
                const isSelf = user.id === currentUserId

                const handleRoleChange = (newRole: string | null) => {
                    if (!newRole) return
                    startTransition(async () => {
                        const result = await changeUserRole(user.id, newRole as 'manager' | 'employee')
                        if (result.success) handleUpdate(user.id, { role: newRole as 'manager' | 'employee' })
                    })
                }

                if (isSelf) return <Badge variant="secondary" className="capitalize">{user.role}</Badge>

                return (
                    <Select value={user.role ?? ""} onValueChange={handleRoleChange} disabled={isPending}>
                        <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                    </Select>
                )
            },
        },
        {
            accessorKey: "is_admin",
            header: "Governance",
            cell: ({ row }) => {
                if (listType === 'pending') return <Badge variant="secondary" className="text-xs">Pending</Badge>
                return row.original.is_admin ? (
                    <Badge variant="outline" className="border-brand-teal text-brand-teal gap-1 text-xs">
                        <ShieldCheck className="w-3 h-3" /> Admin
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">User</Badge>
                )
            },
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                if (listType === 'pending') return <Badge variant="outline" className="border-amber-400 text-amber-500 text-xs">Awaiting Approval</Badge>
                return row.original.is_active ? (
                    <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 text-xs">Active</Badge>
                ) : (
                    <Badge variant="outline" className="border-red-400 text-red-500 text-xs">Inactive</Badge>
                )
            }
        },
        {
            accessorKey: "created_at",
            header: "Registration",
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original
                const isSelf = user.id === currentUserId
                if (isSelf) return null

                if (listType === 'pending') {
                    return <PendingUserActionsCell user={user} isPending={isPending} onUpdate={handleUpdate} />
                }

                return (
                    <UserActionsCell 
                        user={user} 
                        isPending={isPending} 
                        onUpdate={handleUpdate} 
                    />
                )
            },
        }
    ]

    return (
        <div className="space-y-6">
            {pendingUsers.length > 0 && (
                <div className="mb-8 border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 sm:p-6 pb-2">
                    <div className="mb-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-amber-500" />
                            Pending Access Requests
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 text-balance">
                            {pendingUsers.length} user(s) have registered and are awaiting your approval to access the system.
                        </p>
                    </div>
                    <DataTable 
                        columns={createColumns('pending')} 
                        data={pendingUsers} 
                        pageSize={10}
                    />
                </div>
            )}

            <div>
                <h3 className="font-semibold text-foreground">Active Users</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{activeUsers.length} active user(s)</p>
            </div>

            <DataTable 
                columns={createColumns('active')} 
                data={activeUsers} 
                pageSize={10}
            />

            {inactiveUsers.length > 0 && (
                <Collapsible open={inactiveOpen} onOpenChange={setInactiveOpen}>
                    <CollapsibleTrigger className="inline-flex items-center gap-2 h-9 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Inactive Users ({inactiveUsers.length})
                        <ChevronDown className={`w-4 h-4 transition-transform ${inactiveOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 opacity-80">
                        <DataTable 
                            columns={createColumns('inactive')} 
                            data={inactiveUsers} 
                            pageSize={10}
                        />
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    )
}

function PendingUserActionsCell({ user, onUpdate }: { user: ProfileWithEmail, isPending: boolean, onUpdate: (id: string, patch: Partial<ProfileWithEmail>) => void }) {
    const [submittingParams, setSubmittingParams] = useState(false)
    return (
        <div className="flex items-center gap-1 justify-end flex-wrap cursor-default">
            <Button
                variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
                disabled={submittingParams}
                onClick={async () => {
                    setSubmittingParams(true)
                    const result = await approveUser(user.id)
                    setSubmittingParams(false)
                    if (result.success) onUpdate(user.id, { signup_status: 'approved' })
                }}
            >
                {submittingParams ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ShieldCheck className="w-3.5 h-3.5" />} Approve
            </Button>
            <Button
                variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                disabled={submittingParams}
                onClick={async () => {
                    setSubmittingParams(true)
                    const result = await rejectUser(user.id)
                    setSubmittingParams(false)
                    if (result.success) onUpdate(user.id, { signup_status: 'rejected', is_active: false })
                }}
            >
                {submittingParams ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ShieldOff className="w-3.5 h-3.5" />} Reject
            </Button>
        </div>
    )
}


function UserActionsCell({ 
    user, 
    isPending, 
    onUpdate 
}: { 
    user: ProfileWithEmail, 
    isPending: boolean, 
    onUpdate: (id: string, patch: Partial<ProfileWithEmail>) => void 
}) {
    // Admin modal states
    const [grantOpen, setGrantOpen] = useState(false)
    const [revokeOpen, setRevokeOpen] = useState(false)

    // Deactivate confirm
    const [deactivateOpen, setDeactivateOpen] = useState(false)
    const [deactivateError, setDeactivateError] = useState<string | null>(null)
    const [deactivating, setDeactivating] = useState(false)

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
        // This is tricky because we need useTransition but we are in a sub-component
        // But we can just use a simple async/await and local loading state if needed.
        // Actually, let's just use the server actions directly.
        const result = await reactivateUser(user.id)
        if (result.success) onUpdate(user.id, { is_active: true })
    }

    return (
        <div className="flex items-center gap-1 justify-end flex-wrap">
            {/* Grant / Revoke Admin */}
            {user.is_admin ? (
                <Button
                    variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold"
                    onClick={() => setRevokeOpen(true)}
                >
                    <ShieldOff className="w-3.5 h-3.5" /> Revoke
                </Button>
            ) : (
                <Button
                    variant="ghost" size="sm" className="h-7 text-xs gap-1 text-brand-teal hover:bg-teal-50 dark:hover:bg-teal-950/30 font-bold"
                    onClick={() => setGrantOpen(true)}
                >
                    <ShieldCheck className="w-3.5 h-3.5" /> Grant
                </Button>
            )}

            {/* Deactivate / Reactivate */}
            {user.is_active ? (
                <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                    onClick={() => { setDeactivateError(null); setDeactivateOpen(true) }}
                    disabled={isPending}
                >
                    <UserX className="w-3.5 h-3.5" /> Deactivate
                </Button>
            ) : (
                <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
                    onClick={handleReactivate}
                    disabled={isPending}
                >
                    <UserCheck className="w-3.5 h-3.5" /> Reactivate
                </Button>
            )}

            {/* Modals */}
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

            <AlertDialog open={deactivateOpen} onOpenChange={(v) => { if (!v) setDeactivateOpen(false) }}>
                <AlertDialogContent className="p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
                    <AlertDialogHeader className="p-6 pb-4 bg-gradient-to-r from-red-500/10 via-brand-navy/5 to-transparent border-b border-border/50">
                        <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <UserX className="w-5 h-5 text-red-500" />
                            Deactivate Personnel
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="p-6 py-4 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You are about to deactivate <span className="font-bold text-foreground">{user.full_name}</span>. This will immediately invalidate their active sessions and prevent future authentication.
                        </p>
                    </div>
                    <AlertDialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 flex flex-col-reverse sm:flex-row gap-3">
                        <AlertDialogCancel className="mt-0 border-none bg-transparent hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Abort</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeactivate}
                            disabled={deactivating}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-xl font-bold px-8 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                        >
                            {deactivating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            CONFIRM DEACTIVATION
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

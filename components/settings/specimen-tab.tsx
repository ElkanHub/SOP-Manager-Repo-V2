"use client"

import { useState } from "react"
import { Search, User as UserIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import type { Profile } from "@/types/app.types"

interface SpecimenTabProps {
    users: (Profile & { email?: string })[]
}

export function SpecimenTab({ users }: SpecimenTabProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredUsers = users.filter(user => 
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold">Specimen Signatures</CardTitle>
                        <CardDescription>View official signatures and initials for all active personnel.</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9 h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">User</th>
                                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Signature Specimen</th>
                                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Initials Specimen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-border shadow-sm">
                                                        <AvatarImage src={user.avatar_url} />
                                                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                            {user.full_name.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground leading-tight">{user.full_name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                                            {user.department || 'No Department'} • {user.job_title || 'No Title'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center">
                                                    <SpecimenDisplay url={user.signature_url} label="Full Signature" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center">
                                                    <SpecimenDisplay url={user.initials_url} label="Initials" isInitials />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground italic">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function SpecimenDisplay({ url, label, isInitials = false }: { url?: string, label: string, isInitials?: boolean }) {
    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center h-12 w-32 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10">
                <span className="text-[10px] text-muted-foreground italic tracking-tight">Not Captured</span>
            </div>
        )
    }

    return (
        <div className="group relative flex flex-col items-center">
            {/* Checkerboard background for visibility of transparent signatures */}
            <div 
                className="relative h-12 w-32 border border-border rounded-lg bg-white overflow-hidden shadow-sm transition-all group-hover:border-primary/30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='0' width='4' height='4' fill='%23f1f5f9'/%3E%3Crect x='0' y='4' width='4' height='4' fill='%23f1f5f9'/%3E%3C/svg%3E")`,
                }}
            >
                <Image 
                    src={url} 
                    alt={label} 
                    fill 
                    className="object-contain p-1.5"
                    unoptimized 
                />
            </div>
            {/* Optional Zoom on hover if we want, but keeping it simple for now */}
        </div>
    )
}

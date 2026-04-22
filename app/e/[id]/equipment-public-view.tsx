"use client"

import Image from "next/image"
import Link from "next/link"
import { differenceInDays, format } from "date-fns"
import { AlertTriangle, Clock, Wrench, ShieldCheck, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PublicEquipment {
    id: string
    asset_id: string
    name: string
    department: string
    status: "pending_qa" | "active" | "inactive"
    photo_url: string | null
    serial_number: string | null
    model: string | null
    frequency: string
    custom_interval_days: number | null
    last_serviced: string | null
    next_due: string | null
    sops: { id: string; title: string; sop_number: string } | null
}

interface PublicTask {
    id: string
    due_date: string
    status: string
    profiles: { id: string; full_name: string; department: string; avatar_url: string | null } | null
}

interface Props {
    equipment: PublicEquipment
    nextTask: PublicTask | null
    viewerIsAuthenticated: boolean
    equipmentId: string
}

export function EquipmentPublicView({ equipment, nextTask, viewerIsAuthenticated, equipmentId }: Props) {
    const nextDue = equipment.next_due ? new Date(equipment.next_due) : null
    const today = new Date()
    const daysUntilDue = nextDue ? differenceInDays(nextDue, today) : null
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0
    const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-5">
                {/* Brand header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy text-white dark:bg-brand-teal">
                            <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">SOP Guard</p>
                            <p className="text-[10px] text-muted-foreground/70">Equipment Registry</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-border/60">
                        Public View
                    </Badge>
                </div>

                <Card className="overflow-hidden border-border/60 shadow-lg">
                    {equipment.photo_url && (
                        <div className="relative w-full h-48 bg-muted">
                            <Image
                                src={equipment.photo_url}
                                alt={equipment.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 672px"
                            />
                        </div>
                    )}
                    <CardContent className="p-6 space-y-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                    {equipment.asset_id}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={
                                        equipment.status === "active"
                                            ? "border-brand-teal/40 text-brand-teal bg-brand-teal/5 text-[10px] font-bold uppercase"
                                            : equipment.status === "pending_qa"
                                            ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-[10px] font-bold uppercase"
                                            : "border-destructive/40 text-destructive bg-destructive/5 text-[10px] font-bold uppercase"
                                    }
                                >
                                    {equipment.status.replace("_", " ")}
                                </Badge>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {equipment.name}
                            </h1>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-y border-border/50 py-4">
                            <MetaRow label="Department" value={equipment.department} />
                            <MetaRow label="PM Cycle" value={
                                equipment.frequency === "custom"
                                    ? `Every ${equipment.custom_interval_days ?? "?"} days`
                                    : equipment.frequency
                            } capitalize />
                            {equipment.serial_number && (
                                <MetaRow label="Serial #" value={equipment.serial_number} mono />
                            )}
                            {equipment.model && <MetaRow label="Model" value={equipment.model} />}
                            {equipment.last_serviced && (
                                <MetaRow
                                    label="Last Serviced"
                                    value={format(new Date(equipment.last_serviced), "dd MMM yyyy")}
                                />
                            )}
                            {nextDue && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                                        Next Due
                                    </p>
                                    <p className={`font-medium ${
                                        isOverdue
                                            ? "text-destructive"
                                            : isDueSoon
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-foreground"
                                    }`}>
                                        {format(nextDue, "dd MMM yyyy")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Next PM alert */}
                        {nextTask && (
                            <div
                                className={`rounded-lg border p-4 flex items-start gap-3 ${
                                    isOverdue
                                        ? "bg-destructive/10 border-destructive/30"
                                        : isDueSoon
                                        ? "bg-amber-500/10 border-amber-500/30"
                                        : "bg-muted/40 border-border/50"
                                }`}
                            >
                                {isOverdue ? (
                                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                ) : (
                                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        {isOverdue
                                            ? "Overdue for maintenance"
                                            : daysUntilDue === 0
                                            ? "Due today"
                                            : daysUntilDue === 1
                                            ? "Due tomorrow"
                                            : `Due in ${daysUntilDue} days`}
                                    </p>
                                    {nextTask.profiles && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Assigned to{" "}
                                            <span className="font-semibold text-foreground">
                                                {nextTask.profiles.full_name}
                                            </span>
                                            {" · "}
                                            {nextTask.profiles.department}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {equipment.sops && (
                            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center gap-3">
                                <ShieldCheck className="h-4 w-4 text-brand-blue shrink-0" />
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Maintenance Protocol
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                        <span className="font-mono">{equipment.sops.sop_number}</span>
                                        {" — "}
                                        {equipment.sops.title}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Call to action */}
                <Card className="border-border/50 bg-muted/20">
                    <CardContent className="p-5 text-center space-y-3">
                        {viewerIsAuthenticated ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    You&apos;re not assigned to service this equipment.
                                </p>
                                <Link href="/equipment">
                                    <Button variant="outline" size="sm">
                                        Go to Equipment Registry
                                        <ExternalLink className="h-3.5 w-3.5 ml-2" />
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Staff? Sign in to log preventive maintenance.
                                </p>
                                <Link href={`/login?next=/e/${equipmentId}`}>
                                    <Button size="sm" className="bg-brand-teal hover:bg-teal-600">
                                        Sign in to log PM
                                    </Button>
                                </Link>
                            </>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                    Scanned via QR · SOP Guard Pro
                </p>
            </div>
        </div>
    )
}

function MetaRow({
    label,
    value,
    mono,
    capitalize,
}: {
    label: string
    value: string
    mono?: boolean
    capitalize?: boolean
}) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                {label}
            </p>
            <p className={`text-foreground ${mono ? "font-mono text-xs" : "font-medium"} ${capitalize ? "capitalize" : ""}`}>
                {value}
            </p>
        </div>
    )
}

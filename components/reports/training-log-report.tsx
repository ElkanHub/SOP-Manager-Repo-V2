"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface TrainingLogEntry {
    id: string
    actor_id: string
    action: string
    created_at: string
    actor?: { full_name: string; department: string }
    target_user?: { full_name: string }
    module?: { title: string }
    metadata?: any
}

export function TrainingLogReport({ dateFrom, dateTo, isQa }: { dateFrom: string | null; dateTo: string | null; isQa: boolean; isAdmin: boolean }) {
    const [data, setData] = useState<TrainingLogEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const supabase = createClient()

            let query = supabase
                .from('training_log')
                .select(`
                    id, action, created_at, metadata,
                    actor:profiles!training_log_actor_id_fkey(full_name, department),
                    target_user:profiles!training_log_target_user_id_fkey(full_name),
                    module:training_modules(title)
                `)
                .order('created_at', { ascending: false })

            if (dateFrom) {
                query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
            }
            if (dateTo) {
                query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
            }

            const { data: logData, error } = await query
            if (!error && logData) {
                setData(logData as any)
            }
            setLoading(false)
        }
        fetchData()
    }, [dateFrom, dateTo, isQa])

    const columns: ColumnDef<TrainingLogEntry>[] = [
        {
            accessorKey: "created_at",
            header: "Date Time",
            cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm')}</span>,
        },
        {
            accessorKey: "actor",
            header: "Actor",
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.actor?.full_name || 'System'}</div>
                    <div className="text-xs text-muted-foreground">{row.original.actor?.department || 'N/A'}</div>
                </div>
            )
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => {
                const action = row.original.action
                let variant: "default" | "secondary" | "outline" | "destructive" = "outline"
                if (action.includes('completed') || action.includes('passed')) variant = "default"
                if (action.includes('created') || action.includes('published')) variant = "secondary"

                return <Badge variant={variant} className="capitalize text-[10px] sm:text-xs tracking-wider">{action.replace(/_/g, ' ')}</Badge>
            }
        },
        {
            accessorKey: "details",
            header: "Details",
            cell: ({ row }) => {
                const { module, target_user, metadata } = row.original
                return (
                    <div className="text-sm">
                        {module?.title && <div><span className="font-semibold">Module:</span> {module.title}</div>}
                        {target_user?.full_name && <div><span className="font-semibold">Target:</span> {target_user.full_name}</div>}
                        {metadata?.score !== undefined && (
                            <div>
                                <span className="font-semibold">Score:</span> {metadata.score}% ({metadata.passed ? 'Pass' : 'Fail'})
                            </div>
                        )}
                        {metadata?.sop_id && <div className="text-xs text-muted-foreground">Linked SOP updated.</div>}
                    </div>
                )
            }
        }
    ]

    return <DataTable columns={columns} data={data} isLoading={loading} />
}

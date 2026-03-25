"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangeControl } from "@/types/app.types"
import { Badge } from "@/components/ui/badge"

interface DiffViewerProps {
    changeControl: ChangeControl
    oldFileUrl: string
    newFileUrl: string
}

export function DiffViewer({ changeControl, oldFileUrl, newFileUrl }: DiffViewerProps) {
    const [diff, setDiff] = useState<any[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchDiff() {
            setLoading(true)
            try {
                const response = await fetch('/api/change-control/diff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ old_file_url: oldFileUrl, new_file_url: newFileUrl }),
                })
                if (!response.ok) throw new Error('Failed to fetch document comparison')
                const data = await response.json()
                setDiff(data.diff)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDiff()
    }, [oldFileUrl, newFileUrl])

    if (loading) {
        return (
            <Card className="min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-teal" />
                    <p className="text-sm text-muted-foreground animate-pulse">Running semantic analysis between versions...</p>
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="min-h-[400px] flex items-center justify-center border-destructive/20">
                <div className="text-center space-y-4 p-6">
                    <Info className="h-8 w-8 mx-auto text-destructive" />
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <p className="text-xs text-muted-foreground">Ensure both documents are valid .docx files and accessible.</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-soft">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-brand-navy" />
                            Substantive Document Delta
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Unified text comparison identifying structural modifications</p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            - Deletions
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                            + Additions
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="bg-background font-mono text-sm leading-relaxed overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                        {diff && diff.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {diff.map((item, idx) => {
                                    if (item.op === 'equal') {
                                        return (
                                            <div key={idx} className="px-6 py-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                                {item.value}
                                            </div>
                                        )
                                    }
                                    if (item.op === 'delete') {
                                        return (
                                            <div key={idx} className="px-6 py-2 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-l-4 border-red-500 whitespace-pre-wrap">
                                                <span className="opacity-50 mr-2 selection:bg-red-200">-</span>
                                                {item.value}
                                            </div>
                                        )
                                    }
                                    if (item.op === 'insert') {
                                        return (
                                            <div key={idx} className="px-6 py-2 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border-l-4 border-green-500 whitespace-pre-wrap">
                                                <span className="opacity-50 mr-2 selection:bg-green-200">+</span>
                                                {item.value}
                                            </div>
                                        )
                                    }
                                    return null
                                })}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-muted-foreground italic">No substantive changes detected between versions.</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

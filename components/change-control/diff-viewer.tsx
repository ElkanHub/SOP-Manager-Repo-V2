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
    const [diffHtml, setDiffHtml] = useState<string | null>(null)
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
                setDiffHtml(data.diffHtml)
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
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl bg-slate-50/50 dark:bg-slate-900/10">
            <CardHeader className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pb-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <FileText className="h-5 w-5 text-brand-navy" />
                            Format-Preserving Document Delta
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-medium">Structural comparison retaining tables, lists, and typography</p>
                    </div>
                    <div className="flex gap-2 shadow-sm rounded-none overflow-hidden bg-background border border-border">
                        <div className="px-3 py-1.5 bg-red-50/80 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 border-r border-border">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Deletions
                        </div>
                        <div className="px-3 py-1.5 bg-green-50/80 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Additions
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="bg-white dark:bg-card shadow-inner overflow-x-auto min-h-[500px] border-x-4 border-slate-100 dark:border-slate-900">
                    <div className="min-w-full inline-block align-middle p-8 md:p-12">
                        {diffHtml ? (
                            <div 
                                className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-slate 
                                           prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
                                           prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                                           prose-table:border-collapse prose-table:w-full
                                           prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-800 prose-td:p-3
                                           prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-700 prose-th:bg-slate-50 dark:prose-th:bg-slate-900 prose-th:p-3 prose-th:text-left
                                           
                                           [&_ins]:bg-green-300 [&_ins]:text-green-900 [&_ins]:no-underline [&_ins]:dark:bg-green-900/70 [&_ins]:dark:text-green-100 [&_ins]:rounded-sm [&_ins]:px-0.5
                                           [&_del]:bg-red-300 [&_del]:text-red-900 [&_del]:line-through [&_del]:dark:bg-red-900/70 [&_del]:dark:text-red-100 [&_del]:rounded-sm [&_del]:px-0.5"
                                dangerouslySetInnerHTML={{ __html: diffHtml }} 
                            />
                        ) : (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <FileText className="h-6 w-6 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">No Changes Detected</h3>
                                <p className="text-muted-foreground max-w-sm">The semantic analysis did not find any substantive text or formatting differences between the two document versions.</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

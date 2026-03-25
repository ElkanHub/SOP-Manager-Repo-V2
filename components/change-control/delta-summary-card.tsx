"use client"

import { useState, useEffect } from "react"
import { Sparkles, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangeControl } from "@/types/app.types"

interface DeltaSummaryCardProps {
    changeControl: ChangeControl
    onRegenerate?: () => void
}

export function DeltaSummaryCard({ changeControl, onRegenerate }: DeltaSummaryCardProps) {
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<string | null>(changeControl.delta_summary || null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!summary && onRegenerate && !loading) {
            handleRegenerate()
        }
    }, [])

    const handleRegenerate = async () => {
        if (!onRegenerate) return
        
        setLoading(true)
        setError(null)
        
        try {
            await onRegenerate()
        } catch (err: any) {
            setError(err.message || 'Failed to generate summary')
        } finally {
            setLoading(false)
        }
    }

    const summaryPoints = summary 
        ? summary.split('\n').filter(s => s.trim())
        : []

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-brand-teal" />
                        AI Summary of Changes
                    </CardTitle>
                    {loading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm mb-4">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {summaryPoints.length > 0 ? (
                    <ul className="space-y-2">
                        {summaryPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className="text-brand-teal mt-1">•</span>
                                <span>{point.replace(/^[•\-\d.]\s*/, '')}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                            {loading ? 'Analyzing changes...' : 'No summary available'}
                        </p>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                        <strong>Disclaimer:</strong> AI-generated summary. Verify against the full diff before signing.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

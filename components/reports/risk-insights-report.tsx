"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Info, BrainCircuit, ShieldAlert, History, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RiskInsight {
  risk_level: 'low' | 'medium' | 'high'
  insights: string[]
  generated_at?: string
}

export function RiskInsightsReport() {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<RiskInsight | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateInsights = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/gemini/risk-insights', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate insights')
      }

      const data = await response.json()
      setInsights(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return (
          <Badge variant="destructive" className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            High Risk Profile
          </Badge>
        )
      case 'medium':
        return (
          <Badge className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600">
            <Info className="w-3.5 h-3.5" />
            Moderate Risk
          </Badge>
        )
      case 'low':
        return (
          <Badge className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider bg-green-500 text-white hover:bg-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Low Risk
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border/40 pb-8">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-brand-teal/20 to-indigo-500/20 p-3 rounded-2xl shadow-inner">
            <BrainCircuit className="h-6 w-6 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Risk Intelligence</h2>
            <p className="text-sm text-muted-foreground">Neural analysis of governance gaps and compliance debt</p>
          </div>
        </div>
        <Button
          onClick={generateInsights}
          disabled={loading}
          className="relative overflow-hidden group/ai px-6 py-6 rounded-2xl bg-brand-teal hover:bg-teal-600 shadow-lg shadow-brand-teal/20 transition-all active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/ai:animate-[shimmer_2s_infinite] pointer-events-none" />
          {loading ? (
            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 mr-3" />
          )}
          <span className="font-bold tracking-wide uppercase text-xs">Analyze Compliance</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-2xl text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Risk Assessment</h3>
              <div className="pt-2">
                {getRiskBadge(insights.risk_level)}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                This score is derived from recent audit logs, pending approvals, and overdue PM tasks across all departments.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card className="rounded-3xl border-border/40 bg-background/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-black/5">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-8">
                <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-brand-teal" />
                  Neural Synthesis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <ul className="space-y-6">
                  {insights.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-4 group/item">
                      <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl bg-brand-teal/5 flex items-center justify-center text-xs font-bold text-brand-teal group-hover/item:bg-brand-teal group-hover/item:text-white transition-colors">
                        {index + 1}
                      </div>
                      <div className="space-y-1 pt-1">
                        <p className="text-sm leading-relaxed text-foreground/90 font-medium">{insight}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Snapshoted: {insights.generated_at ? format(new Date(insights.generated_at), 'MMM d, yyyy h:mm a') : 'Now'}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 italic bg-muted/30 px-3 py-1 rounded-full">
                    Experimental Intelligence
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!insights && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/10 rounded-3xl border-2 border-dashed border-border/40">
          <div className="relative">
             <div className="absolute inset-0 bg-brand-teal/20 blur-2xl rounded-full" />
             <Sparkles className="h-16 w-16 text-brand-teal relative z-10 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Awaiting Analysis</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Initialize the AI engine to sweep your workspace for potential compliance risks and operational bottlenecks.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

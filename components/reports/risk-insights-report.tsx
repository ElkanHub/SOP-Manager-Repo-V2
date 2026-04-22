"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  BrainCircuit,
  ShieldAlert,
  History,
  ClipboardList,
  RefreshCcw,
  ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getLatestRiskAssessment,
  regenerateRiskAssessment,
  type RiskSignal,
  type RiskSnapshot,
} from "@/actions/risk-assessment"

interface RiskInsightsReportProps {
  isAdmin?: boolean
}

export function RiskInsightsReport({ isAdmin = false }: RiskInsightsReportProps) {
  const [snapshot, setSnapshot] = useState<RiskSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const res = await getLatestRiskAssessment("org")
      if (cancelled) return
      if (res.success) {
        setSnapshot(res.snapshot)
      } else {
        setError(res.error)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const regenerate = () => {
    startTransition(async () => {
      setError(null)
      const res = await regenerateRiskAssessment("org")
      if (res.success) setSnapshot(res.snapshot)
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-brand-teal/20 to-indigo-500/20 p-3 rounded-2xl shadow-inner">
            <BrainCircuit className="h-6 w-6 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">AI Risk Intelligence</h2>
            <p className="text-sm text-muted-foreground">
              Deterministic signals, AI narrative. Cached for cost and reproducibility.
            </p>
          </div>
        </div>
        {isAdmin && snapshot && (
          <Button
            variant="outline"
            onClick={regenerate}
            disabled={isPending}
            className="rounded-xl border-brand-teal/20 hover:bg-brand-teal/5 hover:text-brand-teal"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-2xl text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading && !snapshot && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {snapshot && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: risk level + score + age */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Risk Assessment
                </h3>
                <div className="mt-2">{riskBadge(snapshot.risk_level)}</div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Risk Score
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{snapshot.risk_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${scoreBarClass(snapshot.risk_level)}`}
                    style={{ width: `${snapshot.risk_score}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <History className="h-3 w-3" />
                  <span>Last analyzed</span>
                </div>
                <div className="text-xs font-medium">
                  {formatDistanceToNow(new Date(snapshot.generated_at), { addSuffix: true })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {format(new Date(snapshot.generated_at), "MMM d, yyyy HH:mm")}
                </div>
                {snapshot.is_stale && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Info className="h-3 w-3" />
                    Stale (&gt; 6h)
                  </div>
                )}
              </div>

              {snapshot.model_used && (
                <div className="text-[10px] text-muted-foreground/70">
                  {snapshot.model_used} · {snapshot.latency_ms ?? 0}ms
                </div>
              )}
            </div>
          </div>

          {/* Right: signals + insights */}
          <div className="lg:col-span-3 space-y-6">
            {/* Signals */}
            {snapshot.signals.length > 0 && (
              <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3 px-6">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Signals ({snapshot.signals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/60">
                  {snapshot.signals.map((s, i) => (
                    <SignalRow key={`${s.name}-${i}`} signal={s} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* AI insights */}
            <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-3 px-6">
                <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 text-brand-teal" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {snapshot.insights.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No insights available for this snapshot.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {snapshot.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-teal/10 text-[11px] font-bold text-brand-teal">
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{insight}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6 pt-4 border-t border-border/60 text-[10px] text-muted-foreground italic">
                  AI-generated narrative — the risk level and score are computed deterministically from
                  database signals. Use insights as a supplementary review tool.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && !snapshot && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 rounded-2xl border-2 border-dashed border-border">
          <Sparkles className="h-10 w-10 text-brand-teal/60" />
          <h3 className="text-base font-bold">Awaiting analysis</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            The first read for this scope triggers a fresh assessment — that may take a few seconds.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: RiskSignal }) {
  const tone =
    signal.severity === "critical"
      ? {
          dot: "bg-red-500",
          badge: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
          label: "Critical",
        }
      : signal.severity === "warn"
        ? {
            dot: "bg-amber-500",
            badge: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
            label: "Warning",
          }
        : {
            dot: "bg-blue-500",
            badge: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300",
            label: "Info",
          }

  const Body = (
    <div className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-muted/30">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{signal.name}</span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase tracking-wider h-5 px-1.5 ring-1 border-0 ${tone.badge}`}
          >
            {tone.label}
          </Badge>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {signal.count}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{signal.blurb}</p>
      </div>
      {signal.href && (
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
      )}
    </div>
  )

  return signal.href ? (
    <Link href={signal.href} className="group block">
      {Body}
    </Link>
  ) : (
    <div className="group">{Body}</div>
  )
}

function riskBadge(level: "low" | "medium" | "high") {
  if (level === "high") {
    return (
      <Badge variant="destructive" className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider">
        <ShieldAlert className="w-3.5 h-3.5" />
        High Risk
      </Badge>
    )
  }
  if (level === "medium") {
    return (
      <Badge className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600">
        <Info className="w-3.5 h-3.5" />
        Moderate Risk
      </Badge>
    )
  }
  return (
    <Badge className="h-6 px-3 gap-1.5 font-bold uppercase tracking-wider bg-green-500 text-white hover:bg-green-600">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Low Risk
    </Badge>
  )
}

function scoreBarClass(level: "low" | "medium" | "high") {
  if (level === "high") return "bg-red-500"
  if (level === "medium") return "bg-amber-500"
  return "bg-green-500"
}

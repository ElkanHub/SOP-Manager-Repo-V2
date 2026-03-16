"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            High Risk
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Info className="w-3 h-3 mr-1" />
            Medium Risk
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Low Risk
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">AI Risk Insights</h2>
        <Button
          onClick={generateInsights}
          disabled={loading}
          className="bg-brand-teal hover:bg-teal-600"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate Insights
        </Button>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 bg-red-50 rounded-lg dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {insights && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {getRiskBadge(insights.risk_level)}
          </div>

          <Card>
            <CardContent className="pt-4">
              <h3 className="font-medium mb-3">Key Insights</h3>
              <ul className="space-y-2">
                {insights.insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-teal shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {insights.generated_at && (
            <p className="text-xs text-muted-foreground">
              Generated at {format(new Date(insights.generated_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}

          <p className="text-xs text-muted-foreground border-t pt-4">
            AI-generated assessment. Use as a supplementary review tool only.
          </p>
        </div>
      )}

      {!insights && !loading && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Click "Generate Insights" to analyze your data</p>
        </div>
      )}
    </div>
  )
}

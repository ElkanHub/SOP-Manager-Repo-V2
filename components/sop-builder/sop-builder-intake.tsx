"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type Template = { id: string; name: string; is_default: boolean }

const EXAMPLES = [
  "Cleaning and sanitising the tablet compression area",
  "Handling out-of-specification (OOS) laboratory results",
  "Receiving and quarantining incoming raw materials",
  "Gowning and entry into a Grade C cleanroom",
]

export function SopBuilderIntake({
  departments,
  defaultDepartment,
}: {
  departments: string[]
  templates?: Template[]
  defaultDepartment: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [request, setRequest] = useState("")
  const [department, setDepartment] = useState(defaultDepartment || "")

  async function start() {
    const purpose = request.trim()
    if (!purpose) {
      toast.error("Describe the SOP you want to build.")
      return
    }
    setPending(true)
    try {
      const res = await fetch("/api/sop-builder/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled SOP", purpose, department }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start")
      router.push(`/sop-builder/${data.session.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the agent")
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center px-4 py-3">
        <Button render={<Link href="/sop-builder" />} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What SOP do you want to build?</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Describe the procedure in plain language. The agent drafts a detailed, audit-ready SOP, then you refine it in one conversation.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-input bg-card p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <textarea
              autoFocus
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  start()
                }
              }}
              rows={4}
              placeholder="e.g. Write an SOP for cleaning and sanitising the tablet compression area, including frequency, materials, steps, and the records to complete."
              className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-1 pt-1">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 max-w-[12rem] rounded-lg border border-input bg-background px-2.5 text-sm outline-none"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <Button onClick={start} disabled={pending || !request.trim()}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Build SOP
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setRequest(`Write an SOP for ${e.charAt(0).toLowerCase()}${e.slice(1)}.`)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-brand-teal/40 hover:text-foreground"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

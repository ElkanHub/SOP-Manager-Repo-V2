"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Template = { id: string; name: string; is_default: boolean }

export function SopBuilderIntake({
  departments,
  templates,
  defaultDepartment,
}: {
  departments: string[]
  templates: Template[]
  defaultDepartment: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const defaultTemplate = templates.find((template) => template.is_default)

  async function submit(formData: FormData) {
    setPending(true)
    const payload = Object.fromEntries(formData.entries())
    try {
      const res = await fetch("/api/sop-builder/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create session")
      router.push(`/sop-builder/${data.session.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create SOP Builder session")
    } finally {
      setPending(false)
    }
  }

  return (
    <form action={submit} className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5 rounded-md border border-slate-200 bg-white p-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal">
            <Sparkles className="h-4 w-4" />
            New draft
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Start AI SOP Builder Session</h1>
          <p className="mt-1 text-sm text-muted-foreground">Provide enough operational context for the agent to create a compliant draft.</p>
        </div>

        <Field label="SOP title" name="title" required>
          <Input name="title" required placeholder="e.g. Operation and Cleaning of Tablet Compression Machine" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" name="department">
            <select
              name="department"
              defaultValue={defaultDepartment || ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </Field>
          <Field label="Template" name="selected_template_id">
            <select
              name="selected_template_id"
              defaultValue={defaultTemplate?.id || ""}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">QMS-MANAJA default template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Purpose" name="purpose" required>
          <Textarea name="purpose" required rows={3} placeholder="What this SOP must achieve." />
        </Field>
        <Field label="Objective" name="objective">
          <Textarea name="objective" rows={3} placeholder="Operational or quality objective." />
        </Field>
        <Field label="Scope" name="scope_text">
          <Textarea name="scope_text" rows={3} placeholder="Where the SOP applies and where it does not apply." />
        </Field>
        <Field label="Intended users" name="intended_users">
          <Textarea name="intended_users" rows={2} placeholder="Roles that will use the SOP." />
        </Field>
        <Field label="Equipment or materials" name="equipment">
          <Textarea name="equipment" rows={2} placeholder="Equipment, instruments, materials, or software involved." />
        </Field>
        <Field label="Risks or hazards" name="risks">
          <Textarea name="risks" rows={2} placeholder="Known compliance, safety, contamination, or process risks." />
        </Field>
        <Field label="Records, forms, or logbooks" name="records_forms">
          <Textarea name="records_forms" rows={2} placeholder="Linked forms/logbooks that should be referenced." />
        </Field>
        <Field label="Regulatory or internal references" name="regulatory_refs">
          <Textarea name="regulatory_refs" rows={2} placeholder="GMP, internal policy, related SOPs, standards." />
        </Field>
      </section>

      <aside className="h-fit rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">Draft boundary</h2>
        <p className="mt-2 leading-6">
          Outputs from this builder are draft documents only. They are not controlled, approved, effective, or released for use until they pass through the formal SOP workflow.
        </p>
        <Button type="submit" disabled={pending} className="mt-4 w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create Session
        </Button>
      </aside>
    </form>
  )
}

function Field({ label, name, required, children }: { label: string; name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required ? <span className="text-destructive">*</span> : null}</Label>
      {children}
    </div>
  )
}


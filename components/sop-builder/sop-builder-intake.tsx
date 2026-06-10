"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react"
import Link from "next/link"
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
    <form action={submit} className="min-h-full bg-[#f7f8fa]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <Button render={<Link href="/sop-builder" />} variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Open Workspace
          </Button>
        </header>

        <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal">
              <Sparkles className="h-4 w-4" />
              SOP brief
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Give the agent the first brief.</h1>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <Field label="SOP title" name="title" required>
                <Input name="title" required className="h-10" placeholder="Operation and Cleaning of Tablet Compression Machine" />
              </Field>

              <Field label="Purpose" name="purpose" required>
                <Textarea name="purpose" required rows={5} placeholder="Describe what this SOP must achieve." />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Objective" name="objective">
                  <Textarea name="objective" rows={4} placeholder="Operational or quality objective." />
                </Field>
                <Field label="Scope" name="scope_text">
                  <Textarea name="scope_text" rows={4} placeholder="Where this procedure applies." />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Intended users" name="intended_users">
                  <Textarea name="intended_users" rows={3} placeholder="Roles that will use this SOP." />
                </Field>
                <Field label="Risks or hazards" name="risks">
                  <Textarea name="risks" rows={3} placeholder="Known safety, quality, or compliance risks." />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Equipment or materials" name="equipment">
                  <Textarea name="equipment" rows={3} placeholder="Equipment, instruments, materials, software." />
                </Field>
                <Field label="Records, forms, or logbooks" name="records_forms">
                  <Textarea name="records_forms" rows={3} placeholder="Linked forms or records." />
                </Field>
              </div>

              <Field label="Regulatory or internal references" name="regulatory_refs">
                <Textarea name="regulatory_refs" rows={3} placeholder="GMP, internal policy, related SOPs, standards." />
              </Field>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                <Field label="Department" name="department">
                  <select
                    name="department"
                    defaultValue={defaultDepartment || ""}
                    className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                <Field label="Template" name="selected_template_id">
                  <select
                    name="selected_template_id"
                    defaultValue={defaultTemplate?.id || ""}
                    className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">QMS-MANAJA default template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-semibold">Draft boundary</p>
                <p className="mt-2">Generated content remains a draft until it enters the formal SOP approval workflow.</p>
              </div>
            </aside>
          </div>
        </section>
      </div>
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


"use client"

import { useState } from "react"
import { AlertCircle, Loader2, CheckCircle2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import type { RequestForm, RequestFormField } from "@/types/app.types"
import { submitRequestForm } from "@/actions/request-forms"

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    form: RequestForm | null
    onSubmitted: (referenceNumber: string) => void
}

export function FormFillerDialog({ open, onOpenChange, form, onSubmitted }: Props) {
    const [answers, setAnswers] = useState<Record<string, unknown>>({})
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)

    if (!form) return null

    const fields = (form.fields || []).slice().sort((a, b) => a.position - b.position)

    const onChange = (id: string, val: unknown) => {
        setAnswers((prev) => ({ ...prev, [id]: val }))
    }

    const handleSubmit = async () => {
        setError(null)
        setSubmitting(true)
        try {
            const res = await submitRequestForm(form.id, answers)
            if (!res.success) {
                setError(res.error)
                return
            }
            setSuccess(res.data.referenceNumber)
            onSubmitted(res.data.referenceNumber)
        } finally {
            setSubmitting(false)
        }
    }

    const handleClose = () => {
        if (submitting) return
        onOpenChange(false)
        setTimeout(() => {
            setAnswers({})
            setError(null)
            setSuccess(null)
        }, 300)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : onOpenChange(v))}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50">
                    <DialogTitle className="text-xl">{form.title}</DialogTitle>
                    {form.description && (
                        <DialogDescription>{form.description}</DialogDescription>
                    )}
                </DialogHeader>

                {success ? (
                    <div className="p-10 flex flex-col items-center text-center space-y-3">
                        <CheckCircle2 className="h-12 w-12 text-brand-teal" />
                        <h3 className="text-lg font-bold">Request submitted</h3>
                        <p className="text-sm text-muted-foreground">
                            Your reference number is <span className="font-mono font-bold text-foreground">{success}</span>.
                            QA will review shortly.
                        </p>
                        <Button onClick={handleClose} className="mt-4">Close</Button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {fields.map((f, i) => (
                                <FieldRenderer
                                    key={f.id}
                                    index={i}
                                    field={f}
                                    value={answers[f.id]}
                                    onChange={(v) => onChange(f.id, v)}
                                />
                            ))}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 border-t border-border/40 bg-muted/10 gap-2">
                            <Button variant="ghost" onClick={handleClose} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting} className="bg-brand-teal hover:bg-teal-600">
                                {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                                Submit Request
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

function FieldRenderer({
    field,
    index,
    value,
    onChange,
}: {
    field: RequestFormField
    index: number
    value: unknown
    onChange: (v: unknown) => void
}) {
    if (field.field_type === "note_display") {
        return (
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap">
                {field.label}
            </div>
        )
    }

    const labelNode = (
        <Label className="text-sm font-semibold">
            <span className="text-muted-foreground mr-2">{index + 1}.</span>
            {field.label}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
        </Label>
    )

    const helper = field.helper_text ? (
        <p className="text-xs text-muted-foreground">{field.helper_text}</p>
    ) : null

    switch (field.field_type) {
        case "short_text":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <Input
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={500}
                        placeholder={field.config?.placeholder}
                    />
                </div>
            )
        case "long_text":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <Textarea
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        rows={4}
                        maxLength={5000}
                        placeholder={field.config?.placeholder}
                    />
                </div>
            )
        case "number":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <Input
                        type="number"
                        value={(value as string) ?? ""}
                        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        min={field.config?.min}
                        max={field.config?.max}
                    />
                </div>
            )
        case "date":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <Input
                        type="date"
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            )
        case "dropdown":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <Select value={(value as string) || ""} onValueChange={(v) => onChange(v || "")}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose one…" />
                        </SelectTrigger>
                        <SelectContent>
                            {(field.config?.options || []).map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )
        case "radio":
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <RadioGroup value={(value as string) || ""} onValueChange={(v) => onChange(v)} className="space-y-1.5 mt-1">
                        {(field.config?.options || []).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                                <span className="text-sm">{opt}</span>
                            </label>
                        ))}
                    </RadioGroup>
                </div>
            )
        case "checkbox_single":
            return (
                <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id={field.id}
                            checked={!!value}
                            onCheckedChange={(v) => onChange(!!v)}
                            className="mt-0.5"
                        />
                        <label htmlFor={field.id} className="text-sm cursor-pointer">
                            <span className="text-muted-foreground mr-2">{index + 1}.</span>
                            {field.label}
                            {field.is_required && <span className="text-destructive ml-1">*</span>}
                        </label>
                    </div>
                    {helper}
                </div>
            )
        case "checkbox_multi": {
            const arr = Array.isArray(value) ? (value as string[]) : []
            return (
                <div className="space-y-1.5">
                    {labelNode}
                    {helper}
                    <div className="space-y-1.5 mt-1">
                        {(field.config?.options || []).map((opt) => {
                            const checked = arr.includes(opt)
                            return (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(v) => {
                                            const nextArr = v ? [...arr, opt] : arr.filter((x) => x !== opt)
                                            onChange(nextArr)
                                        }}
                                    />
                                    <span className="text-sm">{opt}</span>
                                </label>
                            )
                        })}
                    </div>
                </div>
            )
        }
        default:
            return null
    }
}

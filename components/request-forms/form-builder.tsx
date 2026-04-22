"use client"

import { useState } from "react"
import { GripVertical, Plus, Trash2, Loader2, AlertCircle, Save, Send } from "lucide-react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

import type { Department, RequestFieldType, RequestForm } from "@/types/app.types"
import {
    createRequestForm,
    updateRequestForm,
    setFormPublishState,
    type FormInput,
} from "@/actions/request-forms"

interface FieldDraft {
    key: string
    label: string
    helper_text: string
    field_type: RequestFieldType
    is_required: boolean
    options: string[]
    min: string
    max: string
    placeholder: string
}

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    existingForm?: RequestForm | null
    departments: Department[]
    onSaved: () => void
}

const FIELD_TYPE_LABELS: Record<RequestFieldType, string> = {
    short_text: "Short text",
    long_text: "Long text / notes",
    number: "Number",
    date: "Date",
    dropdown: "Dropdown (single)",
    radio: "Radio (single)",
    checkbox_single: "Yes / No checkbox",
    checkbox_multi: "Checkboxes (multi)",
    note_display: "Display note (instruction)",
}

const newKey = () => `f_${Math.random().toString(36).slice(2, 10)}`

function fieldFromExisting(f: NonNullable<RequestForm["fields"]>[number]): FieldDraft {
    return {
        key: f.id,
        label: f.label,
        helper_text: f.helper_text || "",
        field_type: f.field_type,
        is_required: f.is_required,
        options: f.config?.options || [],
        min: f.config?.min?.toString() || "",
        max: f.config?.max?.toString() || "",
        placeholder: f.config?.placeholder || "",
    }
}

function emptyField(type: RequestFieldType = "short_text"): FieldDraft {
    return {
        key: newKey(),
        label: "",
        helper_text: "",
        field_type: type,
        is_required: false,
        options: type === "dropdown" || type === "radio" || type === "checkbox_multi" ? ["Option 1"] : [],
        min: "",
        max: "",
        placeholder: "",
    }
}

export function FormBuilderDialog({ open, onOpenChange, existingForm, departments, onSaved }: Props) {
    const isEdit = !!existingForm

    const [title, setTitle] = useState(existingForm?.title || "")
    const [description, setDescription] = useState(existingForm?.description || "")
    const [targetDept, setTargetDept] = useState(existingForm?.target_department || "")
    const [fields, setFields] = useState<FieldDraft[]>(
        existingForm?.fields?.length
            ? existingForm.fields.map(fieldFromExisting)
            : [emptyField("short_text")],
    )

    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState<"save" | "publish" | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e
        if (!over || active.id === over.id) return
        setFields((current) => {
            const oldIndex = current.findIndex((f) => f.key === active.id)
            const newIndex = current.findIndex((f) => f.key === over.id)
            if (oldIndex < 0 || newIndex < 0) return current
            return arrayMove(current, oldIndex, newIndex)
        })
    }

    const addField = () => {
        if (fields.length >= 50) return
        setFields((prev) => [...prev, emptyField("short_text")])
    }

    const removeField = (key: string) => {
        setFields((prev) => (prev.length > 1 ? prev.filter((f) => f.key !== key) : prev))
    }

    const updateField = (key: string, patch: Partial<FieldDraft>) => {
        setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
    }

    const toInput = (): FormInput => ({
        title: title.trim(),
        description: description.trim(),
        targetDepartment: targetDept || null,
        fields: fields.map((f) => ({
            label: f.label,
            helper_text: f.helper_text || undefined,
            field_type: f.field_type,
            is_required: f.is_required,
            config: buildConfig(f),
        })),
    })

    const handleSave = async (thenPublish: boolean) => {
        setError(null)
        setSubmitting(thenPublish ? "publish" : "save")
        try {
            const payload = toInput()
            let formId: string | undefined = existingForm?.id
            if (isEdit && existingForm) {
                const res = await updateRequestForm(existingForm.id, payload)
                if (!res.success) {
                    setError(res.error)
                    return
                }
            } else {
                const res = await createRequestForm(payload)
                if (!res.success) {
                    setError(res.error)
                    return
                }
                formId = res.data.id
            }

            if (thenPublish && formId) {
                const pub = await setFormPublishState(formId, true)
                if (!pub.success) {
                    setError(pub.error)
                    return
                }
            }

            onSaved()
            onOpenChange(false)
        } finally {
            setSubmitting(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50">
                    <DialogTitle className="text-xl">
                        {isEdit ? "Edit Request Form" : "New Request Form"}
                    </DialogTitle>
                    <DialogDescription>
                        Design the fields other departments will fill in when they submit this request.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* Form title + description */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Form Title <span className="text-destructive">*</span></Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Document Request, Deviation Report, Corrective Action"
                                maxLength={200}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Shown to users when they open this form"
                                rows={2}
                                maxLength={2000}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Department (optional)</Label>
                            <Select
                                value={targetDept}
                                onValueChange={(v) => setTargetDept(v || "")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Any department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={d.name}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    Form Fields
                                </h3>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                    Drag to reorder · numbered automatically
                                </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addField} disabled={fields.length >= 50}>
                                <Plus className="h-4 w-4 mr-1.5" /> Add Field
                            </Button>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={fields.map((f) => f.key)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-3">
                                    {fields.map((f, i) => (
                                        <SortableFieldRow
                                            key={f.key}
                                            field={f}
                                            index={i}
                                            onUpdate={(patch) => updateField(f.key, patch)}
                                            onRemove={() => removeField(f.key)}
                                            canRemove={fields.length > 1}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-border/40 bg-muted/10 gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={!!submitting}
                    >
                        {submitting === "save" ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-1.5" />
                        )}
                        Save as Draft
                    </Button>
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={!!submitting}
                        className="bg-brand-teal hover:bg-teal-600"
                    >
                        {submitting === "publish" ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-1.5" />
                        )}
                        {isEdit && existingForm?.is_published ? "Save & Keep Published" : "Save & Publish"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function buildConfig(f: FieldDraft) {
    const config: Record<string, any> = {}
    if (f.field_type === "dropdown" || f.field_type === "radio" || f.field_type === "checkbox_multi") {
        config.options = f.options.filter((o) => o.trim().length > 0)
    }
    if (f.field_type === "number") {
        if (f.min !== "") config.min = Number(f.min)
        if (f.max !== "") config.max = Number(f.max)
    }
    if (f.placeholder) config.placeholder = f.placeholder
    return config
}

function SortableFieldRow({
    field,
    index,
    onUpdate,
    onRemove,
    canRemove,
}: {
    field: FieldDraft
    index: number
    onUpdate: (patch: Partial<FieldDraft>) => void
    onRemove: () => void
    canRemove: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: field.key,
    })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const needsOptions =
        field.field_type === "dropdown" ||
        field.field_type === "radio" ||
        field.field_type === "checkbox_multi"

    const isDisplay = field.field_type === "note_display"

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="rounded-lg border border-border/60 bg-card p-4 space-y-3"
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <span className="mt-1.5 shrink-0 w-7 h-7 rounded-md bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                </span>

                <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {isDisplay ? "Note text" : "Field label"}
                            </Label>
                            <Input
                                value={field.label}
                                onChange={(e) => onUpdate({ label: e.target.value })}
                                placeholder={isDisplay ? "Instruction shown to user…" : "Question or label…"}
                                maxLength={200}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Type
                            </Label>
                            <Select
                                value={field.field_type}
                                onValueChange={(v) =>
                                    onUpdate({
                                        field_type: v as RequestFieldType,
                                        options:
                                            v === "dropdown" || v === "radio" || v === "checkbox_multi"
                                                ? field.options.length
                                                    ? field.options
                                                    : ["Option 1"]
                                                : [],
                                        is_required: v === "note_display" ? false : field.is_required,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(FIELD_TYPE_LABELS) as RequestFieldType[]).map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {FIELD_TYPE_LABELS[t]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!isDisplay && (
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Helper note (optional)
                            </Label>
                            <Input
                                value={field.helper_text}
                                onChange={(e) => onUpdate({ helper_text: e.target.value })}
                                placeholder="Smaller guidance text shown under the field"
                                maxLength={500}
                            />
                        </div>
                    )}

                    {needsOptions && (
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Options
                            </Label>
                            <div className="space-y-2">
                                {field.options.map((opt, oi) => (
                                    <div key={oi} className="flex gap-2">
                                        <Input
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...field.options]
                                                next[oi] = e.target.value
                                                onUpdate({ options: next })
                                            }}
                                            placeholder={`Option ${oi + 1}`}
                                            maxLength={200}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => {
                                                if (field.options.length === 1) return
                                                onUpdate({ options: field.options.filter((_, i) => i !== oi) })
                                            }}
                                            disabled={field.options.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        onUpdate({ options: [...field.options, `Option ${field.options.length + 1}`] })
                                    }
                                    disabled={field.options.length >= 100}
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                                </Button>
                            </div>
                        </div>
                    )}

                    {field.field_type === "number" && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min</Label>
                                <Input
                                    type="number"
                                    value={field.min}
                                    onChange={(e) => onUpdate({ min: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max</Label>
                                <Input
                                    type="number"
                                    value={field.max}
                                    onChange={(e) => onUpdate({ max: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {!isDisplay && (
                        <div className="flex items-center gap-2 pt-1">
                            <Switch
                                checked={field.is_required}
                                onCheckedChange={(v) => onUpdate({ is_required: !!v })}
                                id={`req-${field.key}`}
                            />
                            <Label htmlFor={`req-${field.key}`} className="text-xs font-medium cursor-pointer">
                                Required
                            </Label>
                        </div>
                    )}
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    disabled={!canRemove}
                    aria-label="Delete field"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

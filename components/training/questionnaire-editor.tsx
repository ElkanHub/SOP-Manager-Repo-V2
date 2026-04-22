"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Loader2,
    Wand2,
    FileCheck,
    CheckCircle2,
    Download,
    ScrollText,
    Plus,
    PlusCircle,
    Trash2,
    Save,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Pencil,
} from "lucide-react"
import {
    createQuestionnaire,
    publishQuestionnaire,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    updateQuestionnaireMeta,
} from "@/actions/training"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────
type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "fill_blank"

interface QuestionOption {
    id: string
    text: string
    is_correct?: boolean
}

interface Question {
    id: string
    question_text: string
    question_type: QuestionType
    options: QuestionOption[] | null
    correct_answer: string | null
    display_order: number
}

interface Questionnaire {
    id: string
    title: string
    version: number
    status: "draft" | "published" | "archived"
    passing_score: number
    questions?: Question[]
}

interface Props {
    moduleData: any
    questionnaires: Questionnaire[]
}

// ─── Defaults / helpers ───────────────────────────────────────────────
const QUESTION_TYPES: { value: QuestionType; label: string; hint: string }[] = [
    { value: "multiple_choice", label: "Multiple Choice", hint: "Auto-graded. One correct option." },
    { value: "true_false", label: "True / False", hint: "Auto-graded. Pick which statement is true." },
    { value: "short_answer", label: "Short Answer", hint: "Manual review. Record expected answer for markers." },
    { value: "fill_blank", label: "Fill in the Blank", hint: "Manual review. Record expected answer." },
]

const TYPE_LABEL: Record<QuestionType, string> = {
    multiple_choice: "MC",
    true_false: "T/F",
    short_answer: "Short",
    fill_blank: "Fill",
}

function makeOptionId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10)
}

function defaultOptionsFor(type: QuestionType): QuestionOption[] | null {
    if (type === "multiple_choice") {
        return [
            { id: makeOptionId(), text: "", is_correct: true },
            { id: makeOptionId(), text: "", is_correct: false },
            { id: makeOptionId(), text: "", is_correct: false },
            { id: makeOptionId(), text: "", is_correct: false },
        ]
    }
    if (type === "true_false") {
        return [
            { id: "true", text: "True", is_correct: true },
            { id: "false", text: "False", is_correct: false },
        ]
    }
    return null
}

// ─── Component ────────────────────────────────────────────────────────
export default function QuestionnaireEditor({ moduleData, questionnaires }: Props) {
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)
    const [genProgress, setGenProgress] = useState(0)
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [isPublishing, setIsPublishing] = useState<string | null>(null)

    useEffect(() => {
        return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current) }
    }, [])
    const [numQuestions, setNumQuestions] = useState("5")
    const [passingScore, setPassingScore] = useState("70")

    const [expandedId, setExpandedId] = useState<string | null>(null)

    const sorted = useMemo(
        () => [...questionnaires].sort((a, b) => b.version - a.version),
        [questionnaires],
    )
    const currentQ = sorted[0]

    // Auto-expand the latest draft so the editor is discoverable.
    useEffect(() => {
        if (sorted.length && expandedId === null) {
            const draft = sorted.find((q) => q.status === "draft")
            if (draft) setExpandedId(draft.id)
        }
    }, [sorted, expandedId])

    // ─── Top: AI generate panel ────────────────────────────────────
    const startProgressSim = () => {
        setGenProgress(3)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        progressTimerRef.current = setInterval(() => {
            setGenProgress((p) => {
                if (p >= 92) return p
                const increment = Math.max(0.5, (92 - p) * 0.06)
                return Math.min(92, p + increment)
            })
        }, 400)
    }

    const stopProgressSim = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current)
            progressTimerRef.current = null
        }
    }

    const handleGenerate = async () => {
        setIsGenerating(true)
        startProgressSim()
        try {
            const qRes = await createQuestionnaire({
                moduleId: moduleData.id,
                title: `${moduleData.title} Quiz (v${currentQ ? currentQ.version + 1 : 1})`,
                passingScore: parseInt(passingScore),
            })
            if (qRes.error) throw new Error(qRes.error)

            const res = await fetch("/api/training/generate-questionnaire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    moduleId: moduleData.id,
                    questionnaireId: qRes.questionnaireId,
                    sopId: moduleData.sop_id,
                    questionCount: parseInt(numQuestions),
                }),
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            stopProgressSim()
            setGenProgress(100)
            toast.success(`Generated ${data.count} questions!`)
            setExpandedId(qRes.questionnaireId ?? null)
            router.refresh()
        } catch (e: any) {
            stopProgressSim()
            toast.error(e.message || "Failed to generate questionnaire")
        } finally {
            setTimeout(() => {
                setIsGenerating(false)
                setGenProgress(0)
            }, 500)
        }
    }

    const handlePublish = async (qId: string) => {
        setIsPublishing(qId)
        try {
            const res = await publishQuestionnaire(qId)
            if (res.error) toast.error(res.error)
            else {
                toast.success("Questionnaire published and locked!")
                router.refresh()
            }
        } catch (e: any) {
            toast.error(e.message || "An unexpected error occurred")
        } finally {
            setIsPublishing(null)
        }
    }

    const handleExport = (qId: string) =>
        window.open(`/api/training/export-questionnaire?questionnaireId=${qId}`, "_blank")

    return (
        <div className="space-y-6">
            {/* ─── AI panel ─── */}
            <Card className="bg-card border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" /> AI Assessment Generator
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>Number of Questions</Label>
                            <Input
                                type="number"
                                min="3"
                                max="25"
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(e.target.value)}
                                disabled={isGenerating}
                            />
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label>Passing Score (%)</Label>
                            <Input
                                type="number"
                                min="10"
                                max="100"
                                value={passingScore}
                                onChange={(e) => setPassingScore(e.target.value)}
                                disabled={isGenerating}
                            />
                        </div>
                        <div className="flex-1 w-full flex justify-end">
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || moduleData.status === "archived"}
                                className="bg-primary hover:bg-primary/90 w-full md:w-auto"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {Math.round(genProgress)}%
                                    </>
                                ) : (
                                    "Generate New Assessment"
                                )}
                            </Button>
                        </div>
                    </div>
                    {isGenerating && (
                        <div className="mt-4 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin" /> AI is analyzing the SOP and drafting questions…
                                </span>
                                <span className="tabular-nums font-medium">{Math.round(genProgress)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${genProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── List ─── */}
            {sorted.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/10">
                    <ScrollText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No questionnaires generated yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg mt-6">Assessment History</h3>
                    {sorted.map((q) => {
                        const isExpanded = expandedId === q.id
                        const isDraft = q.status === "draft"
                        return (
                            <Card
                                key={q.id}
                                className={cn(
                                    "overflow-hidden border-border/50 transition-colors",
                                    isDraft ? "border-amber-500/50 bg-amber-500/5" : "bg-card",
                                )}
                            >
                                {/* Header row */}
                                <div className="flex flex-col md:flex-row">
                                    <div className="p-5 sm:p-6 flex-1 border-b md:border-b-0 md:border-r border-border/50">
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <h4 className="font-bold text-base sm:text-lg">{q.title}</h4>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    q.status === "published"
                                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                }
                                            >
                                                {q.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-3 mt-3">
                                            <span className="flex items-center gap-1">
                                                <FileCheck className="h-3.5 w-3.5" /> Version {q.version}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Passing {q.passing_score}%
                                            </span>
                                            <span>{q.questions?.length ?? 0} questions</span>
                                        </div>
                                    </div>

                                    <div className="p-4 md:w-72 bg-muted/20 flex flex-col justify-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full gap-2"
                                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                        >
                                            {isDraft ? <Pencil className="h-4 w-4" /> : <ScrollText className="h-4 w-4" />}
                                            {isExpanded ? "Hide" : isDraft ? "Edit Questions" : "Preview Questions"}
                                        </Button>
                                        {isDraft && (
                                            <Button
                                                onClick={() => handlePublish(q.id)}
                                                disabled={isPublishing === q.id}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {isPublishing === q.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Publish & Lock
                                            </Button>
                                        )}
                                        {q.status === "published" && (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleExport(q.id)}
                                                className="w-full gap-2"
                                            >
                                                <Download className="h-4 w-4" /> Export Paper PDF
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Editor body */}
                                {isExpanded && (
                                    <QuestionList
                                        questionnaire={q}
                                        moduleId={moduleData.id}
                                        readOnly={!isDraft}
                                        onChanged={() => router.refresh()}
                                    />
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─── Question list / editor ──────────────────────────────────────────
function QuestionList({
    questionnaire,
    moduleId,
    readOnly,
    onChanged,
}: {
    questionnaire: Questionnaire
    moduleId: string
    readOnly: boolean
    onChanged: () => void
}) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [reordering, setReordering] = useState(false)
    const [localQuestions, setLocalQuestions] = useState<Question[] | null>(null)
    const [addModal, setAddModal] = useState<{ afterOrder?: number } | null>(null)
    const [metaEdit, setMetaEdit] = useState<{ title: string; passing_score: string } | null>(null)
    const [isSavingMeta, setIsSavingMeta] = useState(false)

    const questions = useMemo(() => {
        const source = localQuestions ?? questionnaire.questions ?? []
        return [...source].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    }, [localQuestions, questionnaire.questions])

    const refresh = () => {
        setLocalQuestions(null)
        onChanged()
    }

    // ─── Meta edit (title / passing score) ───
    const saveMeta = async () => {
        if (!metaEdit) return
        setIsSavingMeta(true)
        const res = await updateQuestionnaireMeta(questionnaire.id, {
            title: metaEdit.title,
            passing_score: parseInt(metaEdit.passing_score),
        })
        setIsSavingMeta(false)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Updated")
            setMetaEdit(null)
            refresh()
        }
    }

    // ─── Per-question actions ───
    const moveQuestion = async (qId: string, direction: "up" | "down") => {
        const ids = questions.map((q) => q.id)
        const idx = ids.indexOf(qId)
        if (idx === -1) return
        if (direction === "up" && idx === 0) return
        if (direction === "down" && idx === ids.length - 1) return

        const swap = direction === "up" ? idx - 1 : idx + 1
        const newIds = [...ids]
        ;[newIds[idx], newIds[swap]] = [newIds[swap], newIds[idx]]

        // Optimistic reorder
        const reordered = newIds.map((id, i) => {
            const q = questions.find((x) => x.id === id)!
            return { ...q, display_order: i + 1 }
        })
        setLocalQuestions(reordered)
        setReordering(true)
        const res = await reorderQuestions(questionnaire.id, newIds)
        setReordering(false)
        if (res.error) {
            toast.error(res.error)
            setLocalQuestions(null)
        } else {
            refresh()
        }
    }

    const handleDelete = async (qId: string) => {
        if (questions.length <= 1) {
            toast.error("A questionnaire needs at least one question")
            return
        }
        setBusyId(qId)
        const res = await deleteQuestion(questionnaire.id, qId)
        setBusyId(null)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Question removed")
            setEditingId((curr) => (curr === qId ? null : curr))
            refresh()
        }
    }

    return (
        <div className="border-t border-border/50 p-4 sm:p-6 space-y-4 bg-background">
            {/* Meta row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {metaEdit ? (
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        <Input
                            value={metaEdit.title}
                            onChange={(e) => setMetaEdit({ ...metaEdit, title: e.target.value })}
                            placeholder="Questionnaire title"
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            min="10"
                            max="100"
                            value={metaEdit.passing_score}
                            onChange={(e) => setMetaEdit({ ...metaEdit, passing_score: e.target.value })}
                            className="sm:w-28"
                            placeholder="Pass %"
                        />
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setMetaEdit(null)} disabled={isSavingMeta}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={saveMeta} disabled={isSavingMeta}>
                                {isSavingMeta ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {readOnly ? (
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Locked — published questionnaires are read-only.
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <GripVertical className="h-3.5 w-3.5" /> Use the arrows to reorder. Click a question to edit.
                                {reordering && <Loader2 className="h-3 w-3 animate-spin" />}
                            </span>
                        )}
                    </div>
                )}

                {!readOnly && !metaEdit && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            setMetaEdit({
                                title: questionnaire.title,
                                passing_score: String(questionnaire.passing_score),
                            })
                        }
                        className="self-start sm:self-auto"
                    >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Meta
                    </Button>
                )}
            </div>

            {/* Insert-at-top */}
            {!readOnly && (
                <InsertButton onClick={() => setAddModal({ afterOrder: 0 })} label="Insert at beginning" />
            )}

            {/* Questions */}
            <div className="space-y-1">
                {questions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                        No questions yet.{" "}
                        {!readOnly && (
                            <button
                                className="underline text-primary"
                                onClick={() => setAddModal({})}
                            >
                                Add one
                            </button>
                        )}
                    </div>
                ) : (
                    questions.map((q, i) => (
                        <div key={q.id}>
                            {editingId === q.id && !readOnly ? (
                                <QuestionEditCard
                                    question={q}
                                    questionnaireId={questionnaire.id}
                                    index={i}
                                    onCancel={() => setEditingId(null)}
                                    onSaved={() => {
                                        setEditingId(null)
                                        refresh()
                                    }}
                                    onDelete={() => handleDelete(q.id)}
                                    isDeleting={busyId === q.id}
                                />
                            ) : (
                                <QuestionViewCard
                                    question={q}
                                    index={i}
                                    readOnly={readOnly}
                                    canMoveUp={i > 0}
                                    canMoveDown={i < questions.length - 1}
                                    onEdit={() => setEditingId(q.id)}
                                    onMoveUp={() => moveQuestion(q.id, "up")}
                                    onMoveDown={() => moveQuestion(q.id, "down")}
                                    reordering={reordering}
                                />
                            )}

                            {!readOnly && (
                                <InsertButton
                                    onClick={() => setAddModal({ afterOrder: q.display_order })}
                                    label={`Insert after Q${i + 1}`}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add modal */}
            {addModal && (
                <AddQuestionDialog
                    open={!!addModal}
                    afterOrder={addModal.afterOrder}
                    questionnaireId={questionnaire.id}
                    onClose={() => setAddModal(null)}
                    onAdded={() => {
                        setAddModal(null)
                        refresh()
                    }}
                />
            )}
        </div>
    )
}

// ─── View card ────────────────────────────────────────────────────────
function QuestionViewCard({
    question,
    index,
    readOnly,
    canMoveUp,
    canMoveDown,
    reordering,
    onEdit,
    onMoveUp,
    onMoveDown,
}: {
    question: Question
    index: number
    readOnly: boolean
    canMoveUp: boolean
    canMoveDown: boolean
    reordering: boolean
    onEdit: () => void
    onMoveUp: () => void
    onMoveDown: () => void
}) {
    return (
        <Card className="overflow-hidden border-border/50 group">
            <div className="flex">
                <div className="w-10 shrink-0 flex flex-col items-center justify-center bg-muted/30 border-r border-border/30 gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground/60">Q{index + 1}</span>
                </div>
                <div className="flex-1 p-4 sm:p-5 relative">
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!readOnly && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={onMoveUp}
                                    disabled={!canMoveUp || reordering}
                                    title="Move up"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={onMoveDown}
                                    disabled={!canMoveDown || reordering}
                                    title="Move down"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={onEdit}
                                    className="h-7 text-xs"
                                >
                                    Edit
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                            {TYPE_LABEL[question.question_type]}
                        </Badge>
                    </div>
                    <p className="text-sm sm:text-base font-medium leading-relaxed pr-24 mb-3">
                        {question.question_text}
                    </p>

                    {(question.question_type === "multiple_choice" ||
                        question.question_type === "true_false") &&
                    Array.isArray(question.options) ? (
                        <ul className="space-y-1.5">
                            {question.options.map((opt) => (
                                <li
                                    key={opt.id}
                                    className={cn(
                                        "flex items-center gap-2 text-sm rounded-md px-2.5 py-1.5",
                                        opt.is_correct
                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                            : "bg-muted/40",
                                    )}
                                >
                                    {opt.is_correct ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                        <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                                    )}
                                    <span className="break-words">{opt.text}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-sm bg-muted/30 p-2.5 rounded-md border-l-2 border-brand-teal/50 text-muted-foreground">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-brand-teal/80">
                                Expected answer
                            </span>
                            <p className="italic mt-0.5">{question.correct_answer || "(none recorded)"}</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}

// ─── Edit card ────────────────────────────────────────────────────────
function QuestionEditCard({
    question,
    questionnaireId,
    index,
    onCancel,
    onSaved,
    onDelete,
    isDeleting,
}: {
    question: Question
    questionnaireId: string
    index: number
    onCancel: () => void
    onSaved: () => void
    onDelete: () => void
    isDeleting: boolean
}) {
    const [text, setText] = useState(question.question_text)
    const [type, setType] = useState<QuestionType>(question.question_type)
    const [options, setOptions] = useState<QuestionOption[]>(
        Array.isArray(question.options) ? question.options : defaultOptionsFor(question.question_type) || [],
    )
    const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer || "")
    const [saving, setSaving] = useState(false)

    const changeType = (next: QuestionType) => {
        setType(next)
        if (next === "multiple_choice" || next === "true_false") {
            setOptions(defaultOptionsFor(next) || [])
        } else {
            setOptions([])
        }
    }

    const setOptionText = (id: string, textVal: string) =>
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text: textVal } : o)))

    const markCorrect = (id: string) =>
        setOptions((prev) => prev.map((o) => ({ ...o, is_correct: o.id === id })))

    const addOption = () =>
        setOptions((prev) => [...prev, { id: makeOptionId(), text: "", is_correct: false }])

    const removeOption = (id: string) =>
        setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.id !== id)))

    const handleSave = async () => {
        if (!text.trim()) {
            toast.error("Question text is required")
            return
        }
        if (type === "multiple_choice" || type === "true_false") {
            if (options.filter((o) => o.is_correct).length !== 1) {
                toast.error("Pick exactly one correct option")
                return
            }
            if (options.some((o) => !o.text.trim())) {
                toast.error("All options must have text")
                return
            }
        }

        setSaving(true)
        const res = await updateQuestion(questionnaireId, question.id, {
            question_text: text,
            question_type: type,
            options: type === "multiple_choice" || type === "true_false" ? options : null,
            correct_answer: type === "short_answer" || type === "fill_blank" ? correctAnswer : null,
        })
        setSaving(false)

        if (res.error) toast.error(res.error)
        else {
            toast.success("Question saved")
            onSaved()
        }
    }

    return (
        <Card className="overflow-hidden border-primary/40 bg-primary/[0.02]">
            <div className="flex">
                <div className="w-10 shrink-0 flex items-center justify-center bg-muted/30 border-r border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground/60">Q{index + 1}</span>
                </div>
                <CardContent className="flex-1 p-4 sm:p-5 space-y-3">
                    <div className="space-y-2">
                        <Label className="text-xs">Question Type</Label>
                        <Select value={type} onValueChange={(v: string | null) => v && changeType(v as QuestionType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {QUESTION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        <div className="flex flex-col items-start">
                                            <span>{t.label}</span>
                                            <span className="text-[10px] text-muted-foreground">{t.hint}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Question Text</Label>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={2}
                            placeholder="What's being tested?"
                        />
                    </div>

                    {(type === "multiple_choice" || type === "true_false") && (
                        <div className="space-y-2">
                            <Label className="text-xs flex items-center justify-between">
                                <span>Options</span>
                                {type === "multiple_choice" && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={addOption}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add option
                                    </Button>
                                )}
                            </Label>
                            <div className="space-y-2">
                                {options.map((opt) => (
                                    <div
                                        key={opt.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors",
                                            opt.is_correct
                                                ? "border-emerald-500/40 bg-emerald-500/5"
                                                : "border-border/50",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => markCorrect(opt.id)}
                                            className="shrink-0 h-5 w-5 rounded-full border flex items-center justify-center transition-colors"
                                            title="Mark as correct"
                                            aria-label="Mark option as correct"
                                            style={{
                                                borderColor: opt.is_correct ? "#10b981" : undefined,
                                                backgroundColor: opt.is_correct ? "#10b981" : "transparent",
                                            }}
                                        >
                                            {opt.is_correct && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </button>
                                        <Input
                                            value={opt.text}
                                            onChange={(e) => setOptionText(opt.id, e.target.value)}
                                            placeholder="Option text"
                                            className="h-8 flex-1"
                                            disabled={type === "true_false"}
                                        />
                                        {type === "multiple_choice" && options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive"
                                                onClick={() => removeOption(opt.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground/80">
                                Tap the circle to mark an option correct. Exactly one correct answer is required.
                            </p>
                        </div>
                    )}

                    {(type === "short_answer" || type === "fill_blank") && (
                        <div className="space-y-2">
                            <Label className="text-xs">Expected Answer (for markers)</Label>
                            <Input
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="What answer should graders look for?"
                            />
                            <p className="text-[10px] text-muted-foreground/80">
                                Note: this type is not auto-graded — the expected answer is shown to reviewers only.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                            onClick={onDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Save
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    )
}

// ─── Add question dialog ─────────────────────────────────────────────
function AddQuestionDialog({
    open,
    afterOrder,
    questionnaireId,
    onClose,
    onAdded,
}: {
    open: boolean
    afterOrder?: number
    questionnaireId: string
    onClose: () => void
    onAdded: () => void
}) {
    const [type, setType] = useState<QuestionType>("multiple_choice")
    const [text, setText] = useState("")
    const [options, setOptions] = useState<QuestionOption[]>(defaultOptionsFor("multiple_choice") || [])
    const [correctAnswer, setCorrectAnswer] = useState("")
    const [isAdding, setIsAdding] = useState(false)

    const changeType = (next: QuestionType) => {
        setType(next)
        if (next === "multiple_choice" || next === "true_false") {
            setOptions(defaultOptionsFor(next) || [])
        } else {
            setOptions([])
        }
    }

    const setOptionText = (id: string, val: string) =>
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text: val } : o)))

    const markCorrect = (id: string) =>
        setOptions((prev) => prev.map((o) => ({ ...o, is_correct: o.id === id })))

    const addOption = () =>
        setOptions((prev) => [...prev, { id: makeOptionId(), text: "", is_correct: false }])

    const removeOption = (id: string) =>
        setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.id !== id)))

    const submit = async () => {
        if (!text.trim()) return toast.error("Question text is required")
        if (type === "multiple_choice" || type === "true_false") {
            if (options.filter((o) => o.is_correct).length !== 1) return toast.error("Pick one correct option")
            if (options.some((o) => !o.text.trim())) return toast.error("All options must have text")
        }

        setIsAdding(true)
        const res = await addQuestion(questionnaireId, {
            question_text: text.trim(),
            question_type: type,
            options: type === "multiple_choice" || type === "true_false" ? options : null,
            correct_answer: type === "short_answer" || type === "fill_blank" ? correctAnswer : null,
            insertAfterOrder: afterOrder,
        })
        setIsAdding(false)

        if (res.error) toast.error(res.error)
        else {
            toast.success("Question added")
            // Reset for next invocation
            setText("")
            setCorrectAnswer("")
            setOptions(defaultOptionsFor(type) || [])
            onAdded()
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Question</DialogTitle>
                    <DialogDescription>
                        {afterOrder === undefined
                            ? "This question will be appended to the end."
                            : afterOrder === 0
                              ? "This question will be inserted at the beginning."
                              : `This question will be inserted after Q${afterOrder}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v: string | null) => v && changeType(v as QuestionType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {QUESTION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Question</Label>
                        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
                    </div>
                    {(type === "multiple_choice" || type === "true_false") && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Options</Label>
                                {type === "multiple_choice" && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={addOption}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {options.map((opt) => (
                                    <div
                                        key={opt.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-md border px-2 py-1.5",
                                            opt.is_correct
                                                ? "border-emerald-500/40 bg-emerald-500/5"
                                                : "border-border/50",
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => markCorrect(opt.id)}
                                            className="shrink-0 h-5 w-5 rounded-full border flex items-center justify-center"
                                            style={{
                                                borderColor: opt.is_correct ? "#10b981" : undefined,
                                                backgroundColor: opt.is_correct ? "#10b981" : "transparent",
                                            }}
                                            aria-label="Mark correct"
                                        >
                                            {opt.is_correct && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </button>
                                        <Input
                                            value={opt.text}
                                            onChange={(e) => setOptionText(opt.id, e.target.value)}
                                            placeholder="Option text"
                                            className="h-8 flex-1"
                                            disabled={type === "true_false"}
                                        />
                                        {type === "multiple_choice" && options.length > 2 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive"
                                                onClick={() => removeOption(opt.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(type === "short_answer" || type === "fill_blank") && (
                        <div className="space-y-2">
                            <Label>Expected Answer (for markers)</Label>
                            <Input
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isAdding}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={isAdding}>
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Question
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Insert-between button ───────────────────────────────────────────
function InsertButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <div className="flex justify-center py-1">
            <button
                onClick={onClick}
                className="group flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-primary/5"
                title={label}
            >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden group-hover:inline">{label}</span>
            </button>
        </div>
    )
}

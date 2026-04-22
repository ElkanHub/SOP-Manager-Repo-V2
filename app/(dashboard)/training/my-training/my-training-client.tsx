"use client"

import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    GraduationCap,
    Clock,
    CheckCircle2,
    AlertTriangle,
    FileCheck,
    Loader2,
    Download,
    Eye,
    X,
    Award,
} from "lucide-react"
import { startAttempt } from "@/actions/training"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

// What portion of the module is "done" given the current assignment state.
// Kept intentionally coarse — we don't persist slide/question-level progress.
function progressForStatus(status: string | null | undefined) {
    switch (status) {
        case "completed":
            return 100
        case "in_progress":
            return 50
        default:
            return 0
    }
}

export default function MyTrainingClient({ assignments, attempts, profile }: any) {
    const router = useRouter()
    const [isStarting, setIsStarting] = useState<string | null>(null)
    const [certPreview, setCertPreview] = useState<{ assignment: any; attempt: any } | null>(null)
    const certRef = useRef<HTMLDivElement | null>(null)

    const handleStart = async (moduleId: string, questionnaireId: string) => {
        setIsStarting(moduleId)
        const res = await startAttempt(questionnaireId, moduleId)
        setIsStarting(null)

        if (res.error) {
            toast.error(res.error)
        } else {
            router.push(`/training/${moduleId}/questionnaire/${questionnaireId}`)
        }
    }

    // Captures the same DOM node used for the preview. During capture the node
    // is temporarily forced to its print dimensions so html2canvas produces a
    // clean landscape-A4 image; the preview's responsive scaling is restored
    // after.
    const handleDownloadCertificate = async () => {
        if (!certPreview || !certRef.current) return
        const node = certRef.current

        const prevTransform = node.style.transform
        const prevWidth = node.style.width
        const prevHeight = node.style.height

        node.style.transform = "none"
        node.style.width = "1122px"
        node.style.height = "793px"

        toast.info("Generating certificate...")
        try {
            const canvas = await html2canvas(node, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            })
            const imgData = canvas.toDataURL("image/png")
            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
            pdf.addImage(imgData, "PNG", 0, 0, 297, 210)
            pdf.save(
                `${certPreview.assignment.module.title.replace(/\s+/g, "_")}_Certificate.pdf`,
            )
            toast.success("Certificate downloaded!")
        } catch (e) {
            console.error(e)
            toast.error("Failed to generate certificate")
        } finally {
            node.style.transform = prevTransform
            node.style.width = prevWidth
            node.style.height = prevHeight
        }
    }

    const pending = assignments.filter((a: any) => a.status !== "completed")
    const completed = assignments.filter((a: any) => a.status === "completed")

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 p-3 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        My Training
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Complete your assigned modules and track your compliance.
                    </p>
                </div>
                <div className="flex gap-3 sm:gap-4 items-center bg-card p-2.5 sm:p-3 rounded-lg border border-border/50 text-sm self-start">
                    <div className="text-center px-3 sm:px-4 border-r border-border/50">
                        <p className="text-muted-foreground text-xs">To Do</p>
                        <p className="font-bold text-lg sm:text-xl">{pending.length}</p>
                    </div>
                    <div className="text-center px-3 sm:px-4">
                        <p className="text-muted-foreground text-xs">Done</p>
                        <p className="font-bold text-lg sm:text-xl text-emerald-500">{completed.length}</p>
                    </div>
                </div>
            </div>

            {/* Pending */}
            <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-semibold border-b border-border/50 pb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" /> Pending Modules
                </h2>
                {pending.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-3" />
                        <p>You have no pending training assignments.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                        {pending.map((a: any) => {
                            const publishedQs =
                                a.module.questionnaires?.filter((q: any) => q.status === "published") || []
                            const latestQ = publishedQs.sort((x: any, y: any) => y.version - x.version)[0]
                            const isOverdue = a.module.deadline && new Date(a.module.deadline) < new Date()
                            const pct = progressForStatus(a.status)
                            const statusLabel =
                                a.status === "in_progress" ? "In Progress" : "Not Started"

                            return (
                                <Card
                                    key={a.id}
                                    className="bg-card border-border/50 shadow-sm relative overflow-hidden"
                                >
                                    {isOverdue && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                                    )}
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <Badge variant={a.module.is_mandatory ? "default" : "secondary"}>
                                                {a.module.is_mandatory ? "Mandatory" : "Optional"}
                                            </Badge>
                                            {a.module.deadline && (
                                                <span
                                                    className={cn(
                                                        "text-[11px] sm:text-xs font-semibold shrink-0",
                                                        isOverdue ? "text-destructive" : "text-amber-500",
                                                    )}
                                                >
                                                    {isOverdue ? "Overdue: " : "Due: "}
                                                    {new Date(a.module.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base sm:text-xl font-bold mb-1.5 sm:mb-2 line-clamp-2">
                                            {a.module.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                                            {a.module.description}
                                        </p>

                                        {/* Progress bar */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                                    {statusLabel}
                                                </span>
                                                <span className="tabular-nums font-medium">{pct}%</span>
                                            </div>
                                            <Progress
                                                value={pct}
                                                className="h-1.5"
                                                indicatorColor={
                                                    pct === 0
                                                        ? "bg-muted-foreground/40"
                                                        : "bg-primary"
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-2 flex-wrap pt-3 sm:pt-4 border-t border-border/50">
                                            <span className="text-[11px] sm:text-xs text-muted-foreground">
                                                SOP: {a.module.sop?.sop_number} v{a.module.sop_version}
                                            </span>
                                            {latestQ ? (
                                                <Button
                                                    onClick={() => handleStart(a.module.id, latestQ.id)}
                                                    disabled={isStarting === a.module.id}
                                                    size="sm"
                                                    className="h-8 sm:h-10"
                                                >
                                                    {isStarting === a.module.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : null}
                                                    {a.status === "in_progress" ? "Resume" : "Start"}
                                                </Button>
                                            ) : (
                                                <span className="text-[11px] sm:text-xs text-destructive flex items-center">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Questionnaire Missing
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Completed */}
            <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-4">
                <h2 className="text-lg sm:text-xl font-semibold border-b border-border/50 pb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Completed Modules
                </h2>
                {completed.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">
                        No completed assignments yet.
                    </p>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {completed.map((a: any) => {
                            const passingAttempt = attempts.find(
                                (att: any) => att.module_id === a.module.id && att.passed === true,
                            )
                            return (
                                <Card key={a.id} className="bg-card/50 border-border/50 shadow-sm">
                                    <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-base sm:text-lg line-clamp-2">
                                                {a.module.title}
                                            </h3>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground mt-1">
                                                <span>
                                                    Completed: {new Date(a.completed_at).toLocaleDateString()}
                                                </span>
                                                {passingAttempt && (
                                                    <span>
                                                        Score:{" "}
                                                        <span className="font-semibold text-emerald-600">
                                                            {Number(passingAttempt.score).toFixed(1)}%
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2">
                                                <Progress
                                                    value={100}
                                                    className="h-1.5 max-w-[240px]"
                                                    indicatorColor="bg-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/library/${a.module.sop_id}`)}
                                                className="gap-2 text-xs h-8 sm:h-9"
                                            >
                                                <FileCheck className="h-3.5 w-3.5" /> View SOP
                                            </Button>
                                            {passingAttempt && (
                                                <Button
                                                    size="sm"
                                                    className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-2 h-8 sm:h-9"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        setCertPreview({ assignment: a, attempt: passingAttempt })
                                                    }
                                                >
                                                    <Award className="h-4 w-4" /> Certificate
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Certificate preview / download */}
            {certPreview && (
                <CertificateModal
                    assignment={certPreview.assignment}
                    attempt={certPreview.attempt}
                    profile={profile}
                    certRef={certRef}
                    onClose={() => setCertPreview(null)}
                    onDownload={handleDownloadCertificate}
                />
            )}
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────
// Responsive certificate preview. The certificate is always rendered at
// its native 1122×793 landscape-A4 size (so html2canvas captures a clean
// PDF), then scaled down with CSS transform to fit any viewport.
// ──────────────────────────────────────────────────────────────────────
function CertificateModal({
    assignment,
    attempt,
    profile,
    certRef,
    onClose,
    onDownload,
}: {
    assignment: any
    attempt: any
    profile: any
    certRef: React.MutableRefObject<HTMLDivElement | null>
    onClose: () => void
    onDownload: () => void
}) {
    // Scale container width to fit viewport. CSS `transform: scale()` with a
    // `width: min(100%, 1122px)` wrapper works cleanly; we rely on the
    // intrinsic aspect ratio to set the container height.
    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
            role="dialog"
            aria-label="Training certificate"
        >
            <div className="w-full max-w-5xl flex items-center justify-between mb-3 sm:mb-4 text-white">
                <div className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    Certificate of Completion
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={onDownload} className="gap-2">
                        <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        className="text-white hover:bg-white/10 gap-2"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Scaling wrapper: width caps at 1122px, then scales down on small
                screens using aspect-ratio to preserve height. */}
            <div
                className="w-full max-w-5xl mx-auto relative"
                style={{ aspectRatio: "1122 / 793" }}
            >
                <div
                    className="absolute inset-0 overflow-hidden rounded-md shadow-2xl bg-white"
                >
                    {/* Intrinsic-size cert, scaled via CSS transform to fit the
                        wrapper. We size the inner element to the exact print
                        dimensions and let transform-origin top-left scale it. */}
                    <div
                        ref={certRef}
                        className="origin-top-left bg-white text-black relative"
                        style={{
                            width: "1122px",
                            height: "793px",
                            transform: "scale(var(--cert-scale))",
                            // Scale so the native 1122px width fits the wrapper.
                            // We compute via CSS using 100cqw if container queries
                            // were available — fall back to inline style on mount.
                            ["--cert-scale" as any]: "1",
                        }}
                    >
                        <CertificateContent
                            fullName={profile.full_name}
                            moduleTitle={assignment.module.title}
                            sopNumber={assignment.module.sop?.sop_number}
                            sopVersion={assignment.module.sop_version}
                            completedAt={assignment.completed_at}
                            score={Number(attempt.score)}
                        />
                    </div>
                    <CertificateScaleController targetRef={certRef} />
                </div>
            </div>
        </div>
    )
}

// Updates the --cert-scale CSS variable to fit the parent wrapper width.
// Watches via ResizeObserver so rotating / resizing updates live.
function CertificateScaleController({
    targetRef,
}: {
    targetRef: React.MutableRefObject<HTMLDivElement | null>
}) {
    useIsomorphicEffect(() => {
        const el = targetRef.current
        const parent = el?.parentElement
        if (!el || !parent) return

        const apply = () => {
            const w = parent.clientWidth
            const scale = Math.min(1, w / 1122)
            el.style.setProperty("--cert-scale", String(scale))
        }

        apply()
        const ro = new ResizeObserver(apply)
        ro.observe(parent)
        window.addEventListener("resize", apply)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", apply)
        }
    }, [targetRef])

    return null
}

// Avoid hydration warnings while still running on client.
const useIsomorphicEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function CertificateContent({
    fullName,
    moduleTitle,
    sopNumber,
    sopVersion,
    completedAt,
    score,
}: {
    fullName: string
    moduleTitle: string
    sopNumber?: string
    sopVersion?: string
    completedAt: string
    score: number
}) {
    return (
        <div className="absolute inset-4 border-4 border-double border-slate-800 flex flex-col items-center justify-center text-center p-12">
            <div className="text-4xl font-serif text-slate-800 font-bold mb-4 uppercase tracking-widest border-b-2 border-slate-800 pb-4 px-12">
                Certificate of Completion
            </div>
            <div className="text-xl text-slate-500 mb-8 italic">This is to certify that</div>
            <div className="text-5xl font-serif text-emerald-800 mb-8">{fullName}</div>
            <div className="text-xl text-slate-500 mb-8 max-w-2xl leading-relaxed">
                has successfully completed the training and assessment requirements for the
                standard operating procedure:
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-4">{moduleTitle}</div>
            {sopNumber && (
                <div className="text-lg text-slate-600 mb-16">
                    {sopNumber}
                    {sopVersion ? ` | Version ${sopVersion}` : ""}
                </div>
            )}

            <div className="flex flex-row justify-between w-full max-w-4xl mt-auto pt-16 gap-6">
                <div className="text-center flex-1">
                    <div className="text-lg font-bold border-b border-black mb-2 pb-1 inline-block min-w-[12rem]">
                        {new Date(completedAt).toLocaleDateString()}
                    </div>
                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">
                        Date of Completion
                    </div>
                </div>
                <div className="text-center flex-1">
                    <div className="text-2xl font-bold text-emerald-700 mb-2 pb-1 inline-block min-w-[12rem]">
                        {score.toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">
                        Assessment Score
                    </div>
                </div>
                <div className="text-center flex-1">
                    <div className="text-lg italic font-serif border-b border-black mb-2 pb-1 inline-block min-w-[12rem]">
                        SOP Manager
                    </div>
                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">
                        Authorized System
                    </div>
                </div>
            </div>
        </div>
    )
}

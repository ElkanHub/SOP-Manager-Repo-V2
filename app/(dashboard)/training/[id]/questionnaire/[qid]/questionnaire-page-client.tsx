"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    FileQuestion,
    BookOpen,
    AlertCircle,
    Award,
    RefreshCcw,
} from "lucide-react"
import { submitAttempt } from "@/actions/training"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function QuestionnairePageClient({ questionnaire, attempt, moduleData }: any) {
    const router = useRouter()
    const [view, setView] = useState<'study' | 'quiz' | 'result'>(attempt.submitted_at ? 'result' : 'study')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [slideIndex, setSlideIndex] = useState(0)
    const [showUnansweredWarning, setShowUnansweredWarning] = useState(false)
    const [localResult, setLocalResult] = useState<{ score: number; passed: boolean } | null>(null)

    const slides = moduleData.slide_deck || []
    const questions = questionnaire.questions || []

    const answeredCount = Object.values(answers).filter(v => v && String(v).trim() !== "").length
    const quizProgressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
    const slideProgressPct = slides.length > 0 ? ((slideIndex + 1) / slides.length) * 100 : 0

    const score = localResult?.score ?? attempt.score ?? 0
    const passed = localResult?.passed ?? attempt.passed ?? false

    const handleNextSlide = () => {
        if (slideIndex < slides.length - 1) setSlideIndex(prev => prev + 1)
        else setView('quiz')
    }
    const handlePrevSlide = () => {
        if (slideIndex > 0) setSlideIndex(prev => prev - 1)
    }

    const setAnswer = (qId: string, val: string) => {
        setAnswers(prev => ({ ...prev, [qId]: val }))
        setShowUnansweredWarning(false)
    }

    const handleSubmit = async () => {
        const unansweredCount = questions.length - answeredCount
        if (unansweredCount > 0 && !showUnansweredWarning) {
            setShowUnansweredWarning(true)
            toast.warning(`${unansweredCount} question${unansweredCount === 1 ? '' : 's'} unanswered — unanswered items are marked incorrect. Tap Submit again to confirm.`)
            return
        }

        setIsSubmitting(true)
        const formattedAnswers = Object.entries(answers).map(([questionId, answerValue]) => ({
            questionId,
            answerValue,
        }))

        const res = await submitAttempt(attempt.id, formattedAnswers)
        setIsSubmitting(false)

        if (res.error) {
            toast.error(res.error)
            return
        }

        // Use the server's authoritative score so the result view doesn't lag
        // behind router.refresh().
        setLocalResult({ score: res.score ?? 0, passed: res.passed ?? false })
        setView('result')
        router.refresh()
    }

    // ─── Study view ──────────────────────────────────────────────────────
    if (view === 'study') {
        const currentSlide = slides[slideIndex]

        if (!currentSlide) {
            return (
                <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 mt-6 sm:mt-12 text-center animate-in fade-in zoom-in-95">
                    <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold">No Slide Deck Available</h2>
                    <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
                        This module does not have a training presentation. You can proceed directly to the assessment.
                    </p>
                    <Button onClick={() => setView('quiz')} size="lg">
                        Proceed to Assessment <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )
        }

        return (
            <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-8rem)] p-3 sm:p-6 md:p-8 animate-in fade-in mt-2 sm:mt-6">
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                    <h1 className="text-lg sm:text-2xl font-bold truncate">{moduleData.title}</h1>
                    <div className="text-[11px] sm:text-sm font-medium text-muted-foreground bg-muted px-2.5 sm:px-3 py-1 rounded-full shrink-0">
                        {slideIndex + 1} / {slides.length}
                    </div>
                </div>

                <Progress value={slideProgressPct} className="h-1.5 mb-4 sm:mb-6" />

                <Card className="flex-1 flex flex-col overflow-hidden bg-card border-border/50 shadow-xl relative">
                    <div className="h-1.5 sm:h-2 bg-gradient-to-r from-primary to-blue-500" />
                    <CardContent className="flex flex-col flex-1 p-5 sm:p-10 md:p-16">
                        <div className="text-[10px] sm:text-xs uppercase tracking-widest text-primary font-bold mb-2 sm:mb-4">
                            {currentSlide.type}
                        </div>
                        <h2 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4 sm:mb-8 leading-tight">
                            {currentSlide.title}
                        </h2>
                        <div className="text-sm sm:text-lg md:text-xl text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">
                            {currentSlide.body}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-2 mt-4 sm:mt-8">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePrevSlide}
                        disabled={slideIndex === 0}
                        className="flex-1 sm:flex-none sm:w-32"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleNextSlide}
                        className="flex-1 sm:flex-none sm:w-36 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                        {slideIndex === slides.length - 1 ? 'Start Quiz' : 'Next'}
                        {slideIndex === slides.length - 1
                            ? <FileQuestion className="ml-2 h-4 w-4" />
                            : <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
            </div>
        )
    }

    // ─── Result view (with celebration) ──────────────────────────────────
    if (view === 'result') {
        return (
            <ResultView
                passed={passed}
                score={score}
                passingScore={questionnaire.passing_score}
                moduleTitle={moduleData.title}
                sopNumber={moduleData.sop?.sop_number}
                sopVersion={moduleData.sop_version}
                onReturn={() => router.push('/training/my-training')}
                onRetry={() => {
                    // Let the my-training page spawn a new attempt.
                    router.push('/training/my-training')
                }}
            />
        )
    }

    // ─── Quiz view ───────────────────────────────────────────────────────
    return (
        <div className="w-full max-w-3xl mx-auto p-3 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 mt-2 sm:mt-6">
            <div className="mb-4 sm:mb-6">
                <Button
                    variant="ghost"
                    onClick={() => setView('study')}
                    className="mb-2 sm:mb-4 -ml-2 sm:-ml-4 text-muted-foreground h-8 sm:h-10 text-xs sm:text-sm"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Back to Slides
                </Button>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{moduleData.title}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                    Assessment Quiz • Passing Score: {questionnaire.passing_score}%
                </p>
            </div>

            {/* Sticky progress bar */}
            <div className="sticky top-0 z-10 -mx-3 sm:mx-0 px-3 sm:px-0 pt-2 pb-3 bg-background/95 backdrop-blur-sm border-b border-border/50 mb-4 sm:mb-6">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-muted-foreground mb-1.5">
                    <span>{answeredCount} / {questions.length} answered</span>
                    <span className="tabular-nums">{Math.round(quizProgressPct)}%</span>
                </div>
                <Progress value={quizProgressPct} className="h-1.5" />
            </div>

            <div className="space-y-4 sm:space-y-8">
                {questions.map((q: any, i: number) => {
                    const isAnswered = !!answers[q.id] && String(answers[q.id]).trim() !== ""
                    return (
                        <Card
                            key={q.id}
                            className={cn(
                                "bg-card border-border/50 shadow-sm overflow-hidden transition-colors",
                                !isAnswered && showUnansweredWarning && "border-amber-500/70",
                            )}
                        >
                            <div className="bg-muted/30 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-border/50 flex items-center justify-between">
                                <span className="font-semibold text-[11px] sm:text-sm text-primary uppercase tracking-wide">
                                    Question {i + 1}
                                </span>
                                {isAnswered && (
                                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                                )}
                            </div>
                            <CardContent className="p-4 sm:p-6">
                                <p className="text-base sm:text-lg font-medium mb-4 sm:mb-6 leading-relaxed">
                                    {q.question_text}
                                </p>

                                {q.question_type === 'multiple_choice' || q.question_type === 'true_false' ? (
                                    <RadioGroup
                                        value={answers[q.id] || ""}
                                        onValueChange={(val) => setAnswer(q.id, val)}
                                        className="space-y-2 sm:space-y-3"
                                    >
                                        {(q.options as any[]).map(opt => (
                                            <div
                                                key={opt.id}
                                                className="flex items-start space-x-3 bg-muted/20 hover:bg-muted/40 p-3 sm:p-4 rounded-xl border border-border/50 transition-colors cursor-pointer group"
                                            >
                                                <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} className="text-primary mt-0.5 shrink-0" />
                                                <Label
                                                    htmlFor={`${q.id}-${opt.id}`}
                                                    className="flex-1 cursor-pointer font-medium text-sm sm:text-base text-muted-foreground group-hover:text-foreground leading-snug"
                                                >
                                                    {opt.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                ) : q.question_type === 'short_answer' ? (
                                    <Textarea
                                        placeholder="Type your answer here..."
                                        className="min-h-[100px] text-sm sm:text-base p-3 sm:p-4"
                                        value={answers[q.id] || ""}
                                        onChange={e => setAnswer(q.id, e.target.value)}
                                    />
                                ) : (
                                    <Input
                                        placeholder="Fill in the blank..."
                                        className="text-sm sm:text-base p-4 sm:p-6"
                                        value={answers[q.id] || ""}
                                        onChange={e => setAnswer(q.id, e.target.value)}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {showUnansweredWarning && (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-bottom-1">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" />
                    <div className="text-xs sm:text-sm">
                        <span className="font-semibold">Heads up:</span> unanswered questions will be marked incorrect. Tap Submit again to confirm.
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 py-5 sm:py-8 px-4 bg-card rounded-xl border border-border/50 shadow-sm mt-6 sm:mt-8">
                <div className="text-xs sm:text-sm order-2 sm:order-1 text-center sm:text-left">
                    <span className="font-bold text-base sm:text-lg">{answeredCount}</span> / {questions.length} Answered
                </div>
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="order-1 sm:order-2 bg-primary hover:bg-primary/90 shadow-lg px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg"
                >
                    {isSubmitting
                        ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>)
                        : "Submit Assessment"}
                </Button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────
// Result view — renders a celebration for passes, a supportive message for
// fails. Uses a pure-CSS confetti burst so we don't pull in a dependency.
// ─────────────────────────────────────────────────────────────────────────
function ResultView({
    passed,
    score,
    passingScore,
    moduleTitle,
    sopNumber,
    sopVersion,
    onReturn,
    onRetry,
}: {
    passed: boolean
    score: number
    passingScore: number
    moduleTitle: string
    sopNumber?: string
    sopVersion?: string
    onReturn: () => void
    onRetry: () => void
}) {
    // Mount-triggered flag so the celebration can replay when navigating away
    // and back isn't possible without a fresh attempt.
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 50)
        return () => clearTimeout(t)
    }, [])

    return (
        <div className="w-full max-w-2xl mx-auto p-3 sm:p-6 mt-4 sm:mt-12 animate-in fade-in zoom-in-95">
            <Card className="relative bg-card shadow-2xl border-border/50 text-center p-5 sm:p-8 overflow-hidden">
                {passed && mounted && <ConfettiBurst />}

                {/* Pulsing halo for pass */}
                {passed && (
                    <div className="absolute inset-x-0 top-8 flex justify-center pointer-events-none">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-emerald-500/10 animate-ping" />
                    </div>
                )}

                <div className="relative">
                    {passed ? (
                        <div className="relative inline-flex mx-auto mb-4 sm:mb-6">
                            <CheckCircle2
                                className={cn(
                                    "h-20 w-20 sm:h-24 sm:w-24 text-emerald-500 drop-shadow-lg transition-all duration-700",
                                    mounted ? "scale-100 rotate-0" : "scale-50 rotate-[-20deg] opacity-0",
                                )}
                            />
                        </div>
                    ) : (
                        <XCircle className="h-20 w-20 sm:h-24 sm:w-24 text-destructive mx-auto mb-4 sm:mb-6" />
                    )}

                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">
                        {passed ? "Assessment Passed!" : "Assessment Not Passed"}
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 px-2">
                        You scored <span className="font-bold text-foreground">{score.toFixed(1)}%</span>
                        {" "}(Passing is {passingScore}%)
                    </p>

                    <div className="bg-muted p-4 sm:p-6 rounded-xl border border-border/50 mb-6 sm:mb-8 max-w-sm mx-auto text-left">
                        <h3 className="font-semibold border-b border-border/50 mb-2.5 sm:mb-3 pb-2 flex items-center text-sm sm:text-base">
                            <BookOpen className="h-4 w-4 mr-2 text-primary" /> Results Summary
                        </h3>
                        <div className="flex justify-between py-1 text-sm gap-3">
                            <span className="text-muted-foreground shrink-0">Module:</span>
                            <span className="font-medium text-right line-clamp-1">{moduleTitle}</span>
                        </div>
                        {sopNumber && (
                            <div className="flex justify-between py-1 text-sm gap-3">
                                <span className="text-muted-foreground shrink-0">SOP:</span>
                                <span className="font-medium text-right">{sopNumber}{sopVersion ? ` • v${sopVersion}` : ""}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-1 border-t border-border/50 mt-2 pt-2 text-sm">
                            <span className="text-muted-foreground">Evaluation:</span>
                            <span className={cn("font-bold", passed ? "text-emerald-600" : "text-destructive")}>
                                {passed ? "COMPLIANT" : "NON-COMPLIANT"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        {passed ? (
                            <Button
                                onClick={onReturn}
                                size="lg"
                                className="px-6 sm:px-8 shadow-lg w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Award className="mr-2 h-4 w-4" /> Go to Certificate
                            </Button>
                        ) : (
                            <>
                                <Button onClick={onRetry} size="lg" variant="default" className="w-full sm:w-auto">
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Retry Assessment
                                </Button>
                                <Button onClick={onReturn} size="lg" variant="outline" className="w-full sm:w-auto">
                                    Return to Hub
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}

// Pure-CSS confetti — 40 pieces with randomised angles and colours. No deps.
function ConfettiBurst() {
    const pieces = Array.from({ length: 40 }, (_, i) => i)
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"]
    return (
        <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
        >
            {pieces.map((i) => {
                const left = (i * 97) % 100
                const delay = (i % 10) * 60
                const duration = 1600 + ((i * 37) % 1200)
                const rotate = (i * 53) % 360
                const color = colors[i % colors.length]
                const size = 6 + (i % 4) * 2
                return (
                    <span
                        key={i}
                        className="absolute top-0 rounded-[2px]"
                        style={{
                            left: `${left}%`,
                            width: `${size}px`,
                            height: `${size * 1.6}px`,
                            backgroundColor: color,
                            transform: `translateY(-20px) rotate(${rotate}deg)`,
                            animation: `confetti-fall ${duration}ms ${delay}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                            opacity: 0,
                        }}
                    />
                )
            })}
            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 0; }
                    10%  { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

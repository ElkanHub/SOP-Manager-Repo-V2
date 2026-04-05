"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, FileQuestion, BookOpen, AlertCircle } from "lucide-react"
import { submitAttempt } from "@/actions/training"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

export default function QuestionnairePageClient({ questionnaire, attempt, moduleData }: any) {
    const router = useRouter()
    const [view, setView] = useState<'study' | 'quiz' | 'result'>(attempt.submitted_at ? 'result' : 'study')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [slideIndex, setSlideIndex] = useState(0)

    const slides = moduleData.slide_deck || []
    const questions = questionnaire.questions || []

    const handleNextSlide = () => {
        if (slideIndex < slides.length - 1) setSlideIndex(prev => prev + 1)
        else setView('quiz')
    }
    const handlePrevSlide = () => {
        if (slideIndex > 0) setSlideIndex(prev => prev - 1)
    }

    const setAnswer = (qId: string, val: string) => {
        setAnswers(prev => ({ ...prev, [qId]: val }))
    }

    const handleSubmit = async () => {
        const unseenCount = questions.length - Object.keys(answers).length
        if (unseenCount > 0) {
            const ok = window.confirm(`You left ${unseenCount} question(s) unanswered. Are you sure you want to submit?`)
            if (!ok) return
        }

        setIsSubmitting(true)
        const formattedAnswers = Object.entries(answers).map(([questionId, answerValue]) => ({
            questionId,
            answerValue
        }))

        const res = await submitAttempt(attempt.id, formattedAnswers)
        setIsSubmitting(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            router.refresh()
            setView('result')
            toast.success("Assessment submitted!")
        }
    }

    if (view === 'study') {
        const currentSlide = slides[slideIndex]

        if (!currentSlide) {
            // Edge case: no slide deck found
            return (
                <div className="w-full max-w-4xl mx-auto space-y-6 p-4 animate-in fade-in zoom-in-95 mt-12 text-center">
                    <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">No Slide Deck Available</h2>
                    <p className="text-muted-foreground mb-8">This module does not have a generated training presentation. You can proceed directly to the assessment.</p>
                    <Button onClick={() => setView('quiz')} size="lg">Proceed to Assessment <ArrowRight className="ml-2 h-4 w-4"/></Button>
                </div>
            )
        }

        return (
            <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[85vh] p-4 md:p-8 animate-in fade-in mt-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">{moduleData.title}</h1>
                    <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Slide {slideIndex + 1} of {slides.length}
                    </div>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden bg-card border-border/50 shadow-xl transition-all relative">
                    <div className="h-2 bg-gradient-to-r from-primary to-blue-500"></div>
                    <CardContent className="flex flex-col flex-1 p-8 md:p-16">
                        <div className="text-xs uppercase tracking-widest text-primary font-bold mb-4">{currentSlide.type}</div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-8 leading-tight">{currentSlide.title}</h2>
                        <div className="text-lg md:text-xl text-muted-foreground whitespace-pre-wrap leading-relaxed flex-1">
                            {currentSlide.body}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between mt-8">
                    <Button variant="outline" size="lg" onClick={handlePrevSlide} disabled={slideIndex === 0} className="w-32">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button size="lg" onClick={handleNextSlide} className="w-32 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                        {slideIndex === slides.length - 1 ? 'Start Quiz' : 'Next'} {slideIndex === slides.length - 1 ? <FileQuestion className="ml-2 h-4 w-4"/> : <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
            </div>
        )
    }

    if (view === 'result') {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-8 p-4 mt-12 animate-in fade-in zoom-in-95">
                <Card className="bg-card shadow-2xl border-border/50 text-center p-8">
                    {attempt.passed ? (
                        <CheckCircle2 className="h-24 w-24 text-emerald-500 mx-auto mb-6" />
                    ) : (
                        <XCircle className="h-24 w-24 text-destructive mx-auto mb-6" />
                    )}
                    <h1 className="text-4xl font-black tracking-tight mb-2">
                        {attempt.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                    </h1>
                    <p className="text-muted-foreground text-lg mb-8">
                        You scored <span className="font-bold text-foreground">{attempt.score?.toFixed(1) || 0}%</span> (Passing is {questionnaire.passing_score}%)
                    </p>
                    
                    <div className="bg-muted p-6 rounded-xl border border-border/50 mb-8 max-w-sm mx-auto text-left">
                        <h3 className="font-semibold border-b border-border/50 mb-3 pb-2 flex items-center"><BookOpen className="h-4 w-4 mr-2 text-primary"/> Results Summary</h3>
                        <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Module:</span>
                            <span className="font-medium text-right ml-4 line-clamp-1">{moduleData.title}</span>
                        </div>
                        <div className="flex justify-between py-1 border-t border-border/50 mt-2 pt-2">
                            <span className="text-muted-foreground">Evaluation:</span>
                            <span className="font-medium">{attempt.passed ? 'COMPLIANT' : 'NON-COMPLIANT'}</span>
                        </div>
                    </div>

                    <Button onClick={() => router.push('/training/my-training')} size="lg" className="px-8 shadow-lg">
                        Return to Hub
                    </Button>
                </Card>
            </div>
        )
    }

    // view === 'quiz'
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-8 mt-6">
            <div className="mb-8">
                <Button variant="ghost" onClick={() => setView('study')} className="mb-4 -ml-4 text-muted-foreground"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Slides</Button>
                <h1 className="text-3xl font-bold tracking-tight">{moduleData.title}</h1>
                <p className="text-muted-foreground mt-2">Assessment Quiz • Passing Score: {questionnaire.passing_score}%</p>
            </div>

            <div className="space-y-8">
                {questions.map((q: any, i: number) => (
                    <Card key={q.id} className="bg-card border-border/50 shadow-sm overflow-hidden">
                        <div className="bg-muted/30 px-6 py-3 border-b border-border/50 flex items-center justify-between">
                            <span className="font-semibold text-sm text-primary uppercase tracking-wide">Question {i + 1}</span>
                        </div>
                        <CardContent className="p-6">
                            <p className="text-lg font-medium mb-6 leading-relaxed">{q.question_text}</p>
                            
                            {q.question_type === 'multiple_choice' || q.question_type === 'true_false' ? (
                                <RadioGroup value={answers[q.id] || ""} onValueChange={(val) => setAnswer(q.id, val)} className="space-y-3">
                                    {(q.options as any[]).map(opt => (
                                        <div key={opt.id} className="flex items-center space-x-3 bg-muted/20 hover:bg-muted/40 p-4 rounded-xl border border-border/50 transition-colors cursor-pointer group">
                                            <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} className="text-primary mt-0.5" />
                                            <Label htmlFor={`${q.id}-${opt.id}`} className="flex-1 cursor-pointer font-medium text-muted-foreground group-hover:text-foreground">
                                                {opt.text}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            ) : q.question_type === 'short_answer' ? (
                                <Textarea 
                                    placeholder="Type your answer here..." 
                                    className="min-h-[100px] text-base p-4"
                                    value={answers[q.id] || ""}
                                    onChange={e => setAnswer(q.id, e.target.value)}
                                />
                            ) : (
                                <Input 
                                    placeholder="Fill in the blank..." 
                                    className="text-base p-6"
                                    value={answers[q.id] || ""}
                                    onChange={e => setAnswer(q.id, e.target.value)}
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-between items-center py-8 px-4 bg-card rounded-xl border border-border/50 shadow-sm mt-8">
                <div className="text-sm">
                    <span className="font-bold text-lg">{Object.keys(answers).length}</span> / {questions.length} Answered
                </div>
                <Button 
                    size="lg" 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 shadow-lg px-8 py-6 text-lg"
                >
                    {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</> : "Submit Assessment"}
                </Button>
            </div>
        </div>
    )
}

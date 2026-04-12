"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Wand2, FileCheck, CheckCircle2, Download, ScrollText } from "lucide-react"
import { createQuestionnaire, publishQuestionnaire } from "@/actions/training"
import { toast } from "sonner"

interface Props {
    moduleData: any
    questionnaires: any[]
}

export default function QuestionnaireEditor({ moduleData, questionnaires }: Props) {
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPublishing, setIsPublishing] = useState<string | null>(null)
    const [numQuestions, setNumQuestions] = useState("5")
    const [passingScore, setPassingScore] = useState("70")
    
    // Sort logic, show latest version first
    const sorted = [...questionnaires].sort((a,b) => b.version - a.version)
    const currentQ = sorted[0]

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // 1. Create questionnaire object
            const qRes = await createQuestionnaire({
                moduleId: moduleData.id,
                title: `${moduleData.title} Quiz (v${currentQ ? currentQ.version + 1 : 1})`,
                passingScore: parseInt(passingScore)
            })

            if (qRes.error) throw new Error(qRes.error)

            // 2. Generate questions via AI
            const res = await fetch('/api/training/generate-questionnaire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moduleId: moduleData.id,
                    questionnaireId: qRes.questionnaireId,
                    sopId: moduleData.sop_id,
                    questionCount: parseInt(numQuestions)
                })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            
            toast.success(`Generated ${data.count} questions successfully!`)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to generate questionnaire")
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePublish = async (qId: string) => {
        setIsPublishing(qId)
        const res = await publishQuestionnaire(qId)
        setIsPublishing(null)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Questionnaire published and locked!")
            router.refresh()
        }
    }

    const handleExport = (qId: string) => {
        window.open(`/api/training/export-questionnaire?questionnaireId=${qId}`, '_blank')
    }

    return (
        <div className="space-y-6">
            <Card className="bg-card border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary"/> AI Assessment Generator</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 flex-1">
                            <Label>Number of Questions</Label>
                            <Input type="number" min="3" max="25" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} disabled={isGenerating} />
                        </div>
                        <div className="space-y-2 flex-1">
                            <Label>Passing Score (%)</Label>
                            <Input type="number" min="10" max="100" value={passingScore} onChange={e => setPassingScore(e.target.value)} disabled={isGenerating} />
                        </div>
                        <div className="flex-1 w-full flex justify-end">
                            <Button onClick={handleGenerate} disabled={isGenerating || moduleData.status === 'archived'} className="bg-primary hover:bg-primary/90 w-full md:w-auto">
                                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Assessment...</> : "Generate New Assessment"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {sorted.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/10">
                    <ScrollText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No questionnaires generated yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg mt-6">Assessment History</h3>
                    {sorted.map(q => (
                        <Card key={q.id} className={`overflow-hidden border-border/50 transition-all ${q.status === 'draft' ? 'border-amber-500/50 bg-amber-500/5' : 'bg-card'}`}>
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-border/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg">{q.title}</h4>
                                        <Badge variant="outline" className={q.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                                            {q.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-4">
                                        <span className="flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> Version {q.version}</span>
                                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Passing: {q.passing_score}%</span>
                                    </div>
                                </div>
                                <div className="p-4 md:w-72 bg-muted/20 flex flex-col justify-center space-y-3">
                                    <p className="text-sm font-medium text-center">{q.questions?.length || 0} Questions Total</p>
                                    {q.status === 'draft' && (
                                        <Button onClick={() => handlePublish(q.id)} disabled={isPublishing === q.id} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                            {isPublishing === q.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Publish & Lock
                                        </Button>
                                    )}
                                    {q.status === 'published' && (
                                        <Button variant="secondary" onClick={() => handleExport(q.id)} className="w-full gap-2">
                                            <Download className="h-4 w-4" /> Export Paper PDF
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Clock, CheckCircle2, AlertTriangle, ArrowRight, FileCheck, Loader2, Download } from "lucide-react"
import { startAttempt } from "@/actions/training"
import { toast } from "sonner"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function MyTrainingClient({ assignments, attempts, profile }: any) {
    const router = useRouter()
    const [isStarting, setIsStarting] = useState<string | null>(null)

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

    const handleDownloadCertificate = async (assignment: any, attempt: any) => {
        toast.info("Generating certificate...")
        const el = document.getElementById(`cert-${assignment.id}`)
        if (!el) return

        el.classList.remove('hidden')
        el.style.position = 'fixed'
        el.style.left = '-9999px'
        el.style.top = '0'
        
        // Let React/DOM update before canvas
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const canvas = await html2canvas(el, { scale: 2, useCORS: true })
        
        el.classList.add('hidden')
        el.style.position = ''
        el.style.left = ''
        el.style.top = ''

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210)
        pdf.save(`${assignment.module.title.replace(/\s+/g, '_')}_Certificate.pdf`)
        toast.success("Certificate downloaded!")
    }

    const pending = assignments.filter((a:any) => a.status !== 'completed')
    const completed = assignments.filter((a:any) => a.status === 'completed')

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><GraduationCap className="h-8 w-8 text-primary"/> My Training</h1>
                    <p className="text-muted-foreground mt-1">Complete your assigned modules and track your compliance.</p>
                </div>
                <div className="flex gap-4 items-center bg-card p-3 rounded-lg border border-border/50 text-sm">
                    <div className="text-center px-4 border-r border-border/50">
                        <p className="text-muted-foreground">To Do</p>
                        <p className="font-bold text-xl">{pending.length}</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-muted-foreground">Done</p>
                        <p className="font-bold text-xl text-emerald-500">{completed.length}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-semibold border-b border-border/50 pb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" /> Pending Modules
                </h2>
                {pending.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-3" />
                        <p>You have no pending training assignments.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {pending.map((a:any) => {
                            const publishedQs = a.module.questionnaires?.filter((q:any) => q.status === 'published') || []
                            const latestQ = publishedQs.sort((x:any, y:any) => y.version - x.version)[0]
                            const isOverdue = a.module.deadline && new Date(a.module.deadline) < new Date()

                            return (
                                <Card key={a.id} className="bg-card border-border/50 shadow-sm relative overflow-hidden">
                                    {isOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>}
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={a.module.is_mandatory ? 'default' : 'secondary'}>
                                                {a.module.is_mandatory ? 'Mandatory' : 'Optional'}
                                            </Badge>
                                            {a.module.deadline && (
                                                <span className={`text-xs font-semibold ${isOverdue ? 'text-destructive' : 'text-amber-500'}`}>
                                                    {isOverdue ? 'Overdue: ' : 'Due: '} {new Date(a.module.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{a.module.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{a.module.description}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                                            <span className="text-xs text-muted-foreground">SOP: {a.module.sop?.sop_number} v{a.module.sop_version}</span>
                                            {latestQ ? (
                                                <Button 
                                                    onClick={() => handleStart(a.module.id, latestQ.id)} 
                                                    disabled={isStarting === a.module.id}
                                                >
                                                    {isStarting === a.module.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                    {a.status === 'in_progress' ? 'Resume' : 'Start'}
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-destructive flex items-center"><AlertTriangle className="h-3 w-3 mr-1" /> Questionnaire Missing</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-6 pt-4">
                <h2 className="text-xl font-semibold border-b border-border/50 pb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Completed Modules
                </h2>
                {completed.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No completed assignments yet.</p>
                ) : (
                    <div className="space-y-4">
                        {completed.map((a:any) => {
                            // Find the passing attempt
                            const passingAttempt = attempts.find((att:any) => att.module_id === a.module.id && att.passed === true)
                            
                            return (
                                <Card key={a.id} className="bg-card/50 border-border/50 shadow-sm opacity-90">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-lg">{a.module.title}</h3>
                                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                <span>Completed: {new Date(a.completed_at).toLocaleDateString()}</span>
                                                {passingAttempt && <span>Score: {passingAttempt.score}%</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <Button variant="outline" size="sm" onClick={() => router.push(`/library/${a.module.sop_id}`)} className="gap-2 text-xs">
                                                <FileCheck className="h-3.5 w-3.5" /> View SOP
                                            </Button>
                                            {passingAttempt && (
                                                <>
                                                    <Button variant="secondary" size="sm" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 gap-2" onClick={() => handleDownloadCertificate(a, passingAttempt)}>
                                                        <Download className="h-4 w-4" /> Certificate
                                                    </Button>
                                                    {/* Hidden Certificate element for html2canvas to capture */}
                                                    <div id={`cert-${a.id}`} className="hidden bg-white text-black p-12 relative overflow-hidden" style={{ width: '1122px', height: '793px' }}>
                                                        <div className="absolute inset-4 border-4 border-double border-slate-800 flex flex-col items-center justify-center text-center p-12">
                                                            <div className="text-4xl font-serif text-slate-800 font-bold mb-4 uppercase tracking-widest border-b-2 border-slate-800 pb-4 px-12">Certificate of Completion</div>
                                                            <div className="text-xl text-slate-500 mb-8 italic">This is to certify that</div>
                                                            <div className="text-5xl font-serif text-emerald-800 mb-8">{profile.full_name}</div>
                                                            <div className="text-xl text-slate-500 mb-8 max-w-2xl leading-relaxed">has successfully completed the training and assessment requirements for the standard operating procedure:</div>
                                                            <div className="text-3xl font-bold text-slate-800 mb-4">{a.module.title}</div>
                                                            <div className="text-lg text-slate-600 mb-16">{a.module.sop?.sop_number} | Version {a.module.sop_version}</div>
                                                            
                                                            <div className="flex flex-col sm:flex-row justify-between w-full max-w-4xl mt-auto pt-16 gap-6 sm:gap-0">
                                                                <div className="text-center">
                                                                    <div className="text-lg font-bold border-b border-black w-48 mb-2 pb-1 inline-block">{new Date(a.completed_at).toLocaleDateString()}</div>
                                                                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Date of Completion</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-2xl font-bold text-emerald-700 w-48 mb-2 pb-1 inline-block">{passingAttempt.score?.toFixed(1)}%</div>
                                                                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Assessment Score</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-lg italic font-serif border-b border-black w-48 mb-2 pb-1 inline-block">SOP Manager</div>
                                                                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Authorized System</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

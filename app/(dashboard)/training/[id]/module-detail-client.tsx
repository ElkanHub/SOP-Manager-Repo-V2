"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayCircle, Presentation, Users, FileCheck, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import { publishTrainingModule, archiveTrainingModule } from "@/actions/training"
import { toast } from "sonner"
import Link from "next/link"

import QuestionnaireEditor from "@/components/training/questionnaire-editor"
import AssignTraineesModal from "@/components/training/assign-trainees-modal"
import SlideDeckEditor from "@/components/training/slide-deck-editor"
import { UserAvatar } from "@/components/user-avatar"

export default function ModuleDetailClient({ moduleData, questionnaires, assignments, attempts, availableUsers, profile, isQa }: any) {
    const router = useRouter()
    const [isPublishing, setIsPublishing] = useState(false)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

    const handlePublish = async () => {
        if (!moduleData.slide_deck || (Array.isArray(moduleData.slide_deck) && moduleData.slide_deck.length === 0)) {
            toast.error("Please generate the Slide Deck first!")
            return
        }
        const hasPublishedQ = questionnaires.some((q: any) => q.status === 'published')
        if (!hasPublishedQ) {
            toast.error("You must publish at least one Questionnaire first!")
            return
        }

        setIsPublishing(true)
        try {
            const res = await publishTrainingModule(moduleData.id)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Module published successfully!")
                router.refresh()
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "An unexpected error occurred while publishing")
        } finally {
            setIsPublishing(false)
        }
    }

    const activeCount = assignments.filter((a:any) => a.status === 'in_progress').length
    const completedCount = assignments.filter((a:any) => a.status === 'completed').length
    const notStartedCount = assignments.filter((a:any) => a.status === 'not_started').length
    const completionRate = assignments.length > 0 ? Math.round((completedCount / assignments.length) * 100) : 0

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-4">
                <Link href="/training">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h2 className="text-xl font-medium text-muted-foreground mr-auto">Back to Hub</h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{moduleData.title}</h1>
                        <Badge variant="outline" className={
                            moduleData.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' :
                            moduleData.status === 'archived' ? 'bg-zinc-500/10 text-zinc-500' : 
                            'bg-blue-500/10 text-blue-500'
                        }>
                            {moduleData.status.toUpperCase()}
                        </Badge>
                        {moduleData.needs_review && (
                            <Badge variant="destructive" className="animate-pulse gap-1"><AlertTriangle className="h-3 w-3" /> SOP Needs Review</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground max-w-2xl">{moduleData.description}</p>
                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><FileCheck className="h-4 w-4" /> SOP: {moduleData.sop?.sop_number} (v{moduleData.sop_version})</span>
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Dept: {moduleData.department}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {moduleData.status === 'draft' && (
                        <Button onClick={handlePublish} disabled={isPublishing} className="bg-primary hover:bg-primary/90 min-w-32">
                            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />} Publish Module
                        </Button>
                    )}
                    {moduleData.status === 'published' && (
                        <Button onClick={() => setIsAssignModalOpen(true)} className="bg-primary hover:bg-primary/90">
                            <Users className="h-4 w-4 mr-2" /> Assign Trainees
                        </Button>
                    )}
                </div>
            </div>

            {moduleData.status === 'published' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    <Card className="bg-card rounded-none">
                        <CardHeader className="pb-2"><CardDescription>Total Assigned</CardDescription><CardTitle className="text-2xl">{assignments.length}</CardTitle></CardHeader>
                    </Card>
                    <Card className="bg-card rounded-none">
                        <CardHeader className="pb-2"><CardDescription>Not Started</CardDescription><CardTitle className="text-2xl">{notStartedCount}</CardTitle></CardHeader>
                    </Card>
                    <Card className="bg-card rounded-none">
                        <CardHeader className="pb-2"><CardDescription>In Progress</CardDescription><CardTitle className="text-2xl">{activeCount}</CardTitle></CardHeader>
                    </Card>
                    <Card className="bg-card rounded-none">
                        <CardHeader className="pb-2"><CardDescription>Completed</CardDescription><CardTitle className="text-2xl">{completedCount}</CardTitle></CardHeader>
                    </Card>
                    <Card className="bg-card rounded-none">
                        <CardHeader className="pb-2"><CardDescription>Completion Rate</CardDescription><CardTitle className="text-2xl">{completionRate}%</CardTitle></CardHeader>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="slides" className="mt-8">
                <TabsList className="bg-muted/50 border border-border/50 p-1 mb-6">
                    <TabsTrigger value="slides" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex gap-2"><Presentation className="h-4 w-4"/> Slide Deck</TabsTrigger>
                    <TabsTrigger value="test" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex gap-2"><CheckCircle2 className="h-4 w-4"/> Questionnaires</TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex gap-2"><Users className="h-4 w-4"/> Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="slides" className="space-y-4">
                    <SlideDeckEditor moduleData={moduleData} />
                </TabsContent>

                <TabsContent value="test">
                    <QuestionnaireEditor moduleData={moduleData} questionnaires={questionnaires} />
                </TabsContent>

                <TabsContent value="users">
                    <Card className="bg-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Trainees</CardTitle>
                                <CardDescription>Track progression and completion status across users.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => setIsAssignModalOpen(true)} disabled={moduleData.status !== 'published'}>Manage Assignments</Button>
                        </CardHeader>
                        <CardContent>
                            {assignments.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No trainees assigned yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {assignments.map((a:any) => (
                                        <div key={a.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={a.assignee} size="lg" />
                                                <div>
                                                    <p className="font-medium">{a.assignee?.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{a.assignee?.department}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline" className={
                                                    a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    a.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted'
                                                }>
                                                    {a.status.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                                {a.completed_at && <p className="text-xs text-muted-foreground mt-1">on {new Date(a.completed_at).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AssignTraineesModal 
                isOpen={isAssignModalOpen} 
                onOpenChange={setIsAssignModalOpen} 
                availableUsers={availableUsers}
                moduleId={moduleData.id}
            />

        </div>
    )
}

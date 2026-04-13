"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TrainingModule, Profile, SopRecord } from "@/types/app.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Plus, Search, BookOpen, AlertTriangle, Clock, ArrowRight } from "lucide-react"
import CreateModuleModal from "@/components/training/create-module-modal"
import { format } from "date-fns"
import Link from "next/link"

interface Props {
    modules: any[]
    activeSops: Partial<SopRecord>[]
    profile: Profile
    isQa: boolean
}

export default function TrainingClient({ modules, activeSops, profile, isQa }: Props) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const filteredModules = modules.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.sop?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.department?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const activeCount = modules.filter(m => m.status === 'published').length
    const reviewCount = modules.filter(m => m.needs_review).length

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Training Hub</h1>
                    <p className="text-muted-foreground mt-1">Manage SOP training modules, assignments, and compliance.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create Module
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border/50 rounded-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-sm font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-400" /> Total Modules
                        </CardDescription>
                        <CardTitle className="text-3xl">{modules.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-card border-border/50 rounded-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-400" /> Published
                        </CardDescription>
                        <CardTitle className="text-3xl">{activeCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-card border-border/50 rounded-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Review
                        </CardDescription>
                        <CardTitle className="text-3xl text-amber-500">{reviewCount}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Search & List */}
            <div className="space-y-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search modules..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 focus-visible:ring-1"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredModules.length === 0 ? (
                        <div className="col-span-full py-12 text-center border border-dashed rounded-xl bg-muted/20">
                            <p className="text-muted-foreground">No training modules found.</p>
                            <Button variant="link" onClick={() => setIsCreateModalOpen(true)}>Create your first one</Button>
                        </div>
                    ) : (
                        filteredModules.map(mod => (
                            <Link key={mod.id} href={`/training/${mod.id}`}>
                                <Card className="group h-full bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
                                    <CardContent className="p-5 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="outline" className={
                                                mod.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                mod.status === 'archived' ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' : 
                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }>
                                                {mod.status.toUpperCase()}
                                            </Badge>
                                            {mod.needs_review && (
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> Update Req
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors">{mod.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{mod.description || "No description provided."}</p>
                                        
                                        <div className="mt-auto pt-4 space-y-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>SOP: {mod.sop?.sop_number || 'Unknown'}</span>
                                                <span>v{mod.sop_version}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                                                <span>Dept: {mod.department}</span>
                                                <span className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                                                    Manage <ArrowRight className="ml-1 h-3 w-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            <CreateModuleModal 
                isOpen={isCreateModalOpen} 
                onOpenChange={setIsCreateModalOpen} 
                activeSops={activeSops}
                profile={profile}
                isQa={isQa}
            />
        </div>
    )
}

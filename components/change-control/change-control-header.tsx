"use client"

import { differenceInDays, format } from "date-fns"
import { Clock, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChangeControl, CcSignatory } from "@/types/app.types"

interface ChangeControlHeaderProps {
    changeControl: ChangeControl & {
        sops?: {
            id: string
            sop_number: string
            title: string
            department: string
            version: string
        }
    }
    signatureCount: number
    totalRequired: number
}

export function ChangeControlHeader({ 
    changeControl, 
    signatureCount, 
    totalRequired 
}: ChangeControlHeaderProps) {
    const sop = changeControl.sops
    const deadline = new Date(changeControl.deadline)
    const today = new Date()
    const daysUntilDeadline = differenceInDays(deadline, today)
    
    const isOverdue = daysUntilDeadline < 0
    const isDueSoon = daysUntilDeadline >= 0 && daysUntilDeadline <= 3
    
    const ccRef = `CC-${new Date(changeControl.created_at).getFullYear()}-${changeControl.id.slice(0, 4).toUpperCase()}`

    return (
        <div className={`
            relative rounded-lg border p-6
            ${changeControl.status === 'pending' 
                ? 'bg-card dark:bg-card border-border' 
                : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'}
        `}>
            {changeControl.status === 'pending' && (
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-teal/5 to-transparent animate-pulse" />
                </div>
            )}
            
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm font-medium text-muted-foreground">
                                {ccRef}
                            </span>
                            <Badge 
                                variant="outline"
                                className={`
                                    ${changeControl.status === 'complete' 
                                        ? 'border-green-500 text-green-600 dark:text-green-400' 
                                        : 'border-red-500 text-red-600 dark:text-red-400'}
                                `}
                            >
                                {changeControl.status === 'complete' ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1" />Complete</>
                                ) : (
                                    <><Clock className="h-3 w-3 mr-1" />Pending Signatures</>
                                )}
                            </Badge>
                        </div>
                        <h1 className="text-xl font-bold">{sop?.title}</h1>
                        <p className="text-sm text-muted-foreground">
                            {sop?.sop_number} • {sop?.department}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className={`
                            font-medium
                            ${isOverdue ? 'text-red-600 dark:text-red-400' : 
                              isDueSoon ? 'text-amber-600 dark:text-amber-400' : ''}
                        `}>
                            {format(deadline, 'MMM d, yyyy')}
                            {isOverdue && (
                                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                    OVERDUE
                                </span>
                            )}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Progress:</span>
                        <span className="font-medium">
                            {signatureCount} of {totalRequired} signatures collected
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Version:</span>
                        <span className="font-mono">
                            {changeControl.old_version} → {changeControl.new_version}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

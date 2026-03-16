"use client"

import { useState } from "react"
import { FileText, ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangeControl } from "@/types/app.types"

interface DiffViewerProps {
    changeControl: ChangeControl
    oldFileUrl: string
    newFileUrl: string
}

export function DiffViewer({ changeControl, oldFileUrl, newFileUrl }: DiffViewerProps) {
    const [showChangesOnly, setShowChangesOnly] = useState(false)
    const [showOld, setShowOld] = useState(true)
    const [showNew, setShowNew] = useState(true)

    const diffJson = changeControl.diff_json as any[]
    
    const hasDiff = diffJson && diffJson.length > 0

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Document Comparison</CardTitle>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowChangesOnly(!showChangesOnly)}
                    >
                        {showChangesOnly ? (
                            <><EyeOff className="h-4 w-4 mr-2" />Show All</>
                        ) : (
                            <><Eye className="h-4 w-4 mr-2" />Changes Only</>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className={`
                        rounded-lg border overflow-hidden
                        ${showOld ? 'block' : 'hidden'}
                    `}>
                        <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    Old Version
                                </span>
                            </div>
                            <span className="text-xs text-red-600 dark:text-red-400 font-mono">
                                {changeControl.old_version}
                            </span>
                        </div>
                        <div className="p-4 bg-background dark:bg-card max-h-[400px] overflow-y-auto">
                            {hasDiff ? (
                                <div className="space-y-2">
                                    {diffJson.map((item: any, idx: number) => {
                                        if (showChangesOnly && item.op === 'equal') return null
                                        if (item.op === 'insert' || item.op === 'delete') {
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`
                                                        p-2 rounded text-sm
                                                        ${item.op === 'delete' ? 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200' : ''}
                                                    `}
                                                >
                                                    {item.value}
                                                </div>
                                            )
                                        }
                                        return (
                                            <div key={idx} className="p-2 text-sm text-muted-foreground">
                                                {item.value}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Old document content</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`
                        rounded-lg border overflow-hidden
                        ${showNew ? 'block' : 'hidden'}
                    `}>
                        <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                    New Version
                                </span>
                            </div>
                            <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                                {changeControl.new_version}
                            </span>
                        </div>
                        <div className="p-4 bg-background dark:bg-card max-h-[400px] overflow-y-auto">
                            {hasDiff ? (
                                <div className="space-y-2">
                                    {diffJson.map((item: any, idx: number) => {
                                        if (showChangesOnly && item.op === 'equal') return null
                                        if (item.op === 'insert' || item.op === 'equal') {
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`
                                                        p-2 rounded text-sm
                                                        ${item.op === 'insert' ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200' : ''}
                                                    `}
                                                >
                                                    {item.value}
                                                </div>
                                            )
                                        }
                                        return null
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">New document content</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

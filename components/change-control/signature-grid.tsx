"use client"

import { CheckCircle2, Clock, UserX, PenTool } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CcSignatory, SignatureCertificate } from "@/types/app.types"

interface SignatureGridProps {
    signatories: CcSignatory[]
    certificates: SignatureCertificate[]
    currentUserId: string
    isAdmin: boolean
    canSign: boolean
    onSign: () => void
    onWaive: (userId: string) => void
    isLocked?: boolean
}

export function SignatureGrid({
    signatories,
    certificates,
    currentUserId,
    isAdmin,
    canSign,
    onSign,
    onWaive,
    isLocked
}: SignatureGridProps) {
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    const getSignatureRecord = (userId: string) => {
        return certificates.find(cert => cert.user_id === userId)
    }

    return (
        <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">
                Required Signatories
            </h3>
            
            <div className="space-y-2">
                {signatories.map((signatory) => {
                    const certificate = getSignatureRecord(signatory.user_id)
                    const isCurrentUser = signatory.user_id === currentUserId
                    const canWaiveThis = isAdmin && !signatory.waived && !certificate

                    return (
                        <div 
                            key={signatory.user_id}
                            className={`
                                flex items-center justify-between p-3 rounded-lg border
                                ${signatory.waived 
                                    ? 'bg-muted/50 dark:bg-muted/30 border-dashed opacity-60' 
                                    : 'bg-card dark:bg-card'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="text-xs bg-muted">
                                        {getInitials(signatory.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {signatory.full_name}
                                        </span>
                                        {isCurrentUser && (
                                            <Badge variant="secondary" className="text-xs">
                                                You
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="outline" className="text-xs">
                                            {signatory.role}
                                        </Badge>
                                        <span>{signatory.department}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {certificate ? (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            Signed
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(certificate.signed_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ) : signatory.waived ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <UserX className="h-4 w-4" />
                                        <span className="text-sm">
                                            Waived by Admin
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-sm">Pending</span>
                                    </div>
                                )}

                                {isCurrentUser && canSign && !isLocked && (
                                    <Button 
                                        size="sm" 
                                        onClick={onSign}
                                        className="ml-2 bg-brand-teal hover:bg-teal-600"
                                    >
                                        <PenTool className="h-3 w-3 mr-1" />
                                        Sign
                                    </Button>
                                )}

                                {canWaiveThis && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => onWaive(signatory.user_id)}
                                        className="ml-2"
                                    >
                                        Waive
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {signatories.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No signatories defined</p>
                </div>
            )}
        </div>
    )
}

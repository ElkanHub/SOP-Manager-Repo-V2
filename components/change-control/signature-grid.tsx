"use client"

import { CheckCircle2, Clock, UserX, PenTool } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CcSignatory, SignatureCertificate } from "@/types/app.types"
import { getInitials } from "@/lib/utils"

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

    const getSignatureRecord = (userId: string) => {
        return certificates.find(cert => cert.user_id === userId)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                    Governance Signatories
                </h3>
                <Badge variant="outline" className="text-[9px] font-bold tracking-tighter border-brand-teal/30 text-brand-teal">AUDIT READY</Badge>
            </div>
            
            <div className="space-y-2">
                {signatories.map((signatory) => {
                    const certificate = getSignatureRecord(signatory.user_id)
                    const isCurrentUser = signatory.user_id === currentUserId
                    const canWaiveThis = isAdmin && !signatory.waived && !certificate

                    return (
                        <div 
                            key={signatory.user_id}
                            className={`
                                flex items-center justify-between p-4 rounded-2xl border transition-all duration-300
                                ${signatory.waived 
                                    ? 'bg-muted/30 border-dashed border-border/50 opacity-60' 
                                    : 'bg-card/40 backdrop-blur-sm border-border/40 hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border border-border/40 shadow-sm">
                                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-brand-teal/20 to-brand-navy/10 text-brand-teal">
                                        {getInitials(signatory.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-sm tracking-tight text-foreground">
                                            {signatory.full_name}
                                        </span>
                                        {isCurrentUser && (
                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-brand-teal/10 text-brand-teal border-none">
                                                Self
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{signatory.role}</span>
                                        <div className="w-1 h-1 rounded-full bg-border" />
                                        <span className="text-[10px] font-bold text-brand-teal/70 uppercase tracking-widest">{signatory.department}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {certificate ? (
                                    <div className="flex items-center gap-3 bg-green-500/5 px-3 py-1.5 rounded-xl border border-green-500/20 text-green-700 dark:text-green-400 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="p-1 rounded-full bg-green-500/20">
                                            <CheckCircle2 className="h-3 w-3" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Cryptographically Signed</span>
                                            <span className="text-[9px] font-medium opacity-60">
                                                {new Date(certificate.signed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                ) : signatory.waived ? (
                                    <div className="flex items-center gap-2 text-muted-foreground/60 bg-muted/20 px-3 py-1.5 rounded-xl border border-border/40">
                                        <UserX className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">
                                            Waived · Admin
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-600/70 bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/20">
                                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest font-mono italic">Pending Validation</span>
                                    </div>
                                )}

                                {isCurrentUser && canSign && !isLocked && (
                                    <Button 
                                        size="sm" 
                                        onClick={onSign}
                                        className="h-9 px-4 bg-brand-navy hover:bg-brand-navy/90 text-white shadow-xl font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale"
                                    >
                                        <PenTool className="h-3.5 w-3.5 mr-2" />
                                        Execute Signature
                                    </Button>
                                )}

                                {canWaiveThis && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => onWaive(signatory.user_id)}
                                        className="h-9 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
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

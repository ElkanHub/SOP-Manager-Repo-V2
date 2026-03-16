"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChangeControlHeader } from "@/components/change-control/change-control-header"
import { DiffViewer } from "@/components/change-control/diff-viewer"
import { DeltaSummaryCard } from "@/components/change-control/delta-summary-card"
import { SignatureGrid } from "@/components/change-control/signature-grid"
import { SignatureConfirmModal } from "@/components/change-control/signature-confirm-modal"
import { WaiveModal } from "@/components/change-control/waive-modal"
import { signChangeControl, waiveSignature, generateDeltaSummary } from "@/actions/sop"
import { createClient } from "@/lib/supabase/client"
import { ChangeControl, CcSignatory, SignatureCertificate, Profile } from "@/types/app.types"

interface ChangeControlClientProps {
    changeControl: ChangeControl & {
        sops?: {
            id: string
            sop_number: string
            title: string
            department: string
            version: string
        }
    }
    signatureCertificates: SignatureCertificate[]
    currentUserId: string
    currentUserProfile: Profile
    isAdmin: boolean
    canSign: boolean
}

export function ChangeControlClient({
    changeControl,
    signatureCertificates,
    currentUserId,
    currentUserProfile,
    isAdmin,
    canSign,
}: ChangeControlClientProps) {
    const [signing, setSigning] = useState(false)
    const [waiving, setWaiving] = useState(false)
    const [signModalOpen, setSignModalOpen] = useState(false)
    const [waiveModalOpen, setWaiveModalOpen] = useState(false)
    const [waiveTarget, setWaiveTarget] = useState<{ id: string; name: string } | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const signatories = changeControl.required_signatories as CcSignatory[] || []
    const signedCount = signatories.filter(s => {
        const cert = signatureCertificates.find(c => c.user_id === s.user_id)
        return cert || s.waived
    }).length

    const ccRef = `CC-${new Date(changeControl.created_at).getFullYear()}-${changeControl.id.slice(0, 4).toUpperCase()}`

    const handleSign = async () => {
        setSigning(true)
        try {
            const result = await signChangeControl(changeControl.id)
            if (result.success) {
                setRefreshKey(k => k + 1)
            }
        } finally {
            setSigning(false)
        }
    }

    const handleWaive = async () => {
        if (!waiveTarget) return
        
        setWaiving(true)
        try {
            const result = await waiveSignature(changeControl.id, waiveTarget.id, 'Waived by admin')
            if (result.success) {
                setRefreshKey(k => k + 1)
            }
        } finally {
            setWaiving(false)
            setWaiveModalOpen(false)
            setWaiveTarget(null)
        }
    }

    const handleRegenerateSummary = async () => {
        await generateDeltaSummary(changeControl.id)
        setRefreshKey(k => k + 1)
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="mb-6">
                <Link href="/library" className="text-brand-blue hover:underline flex items-center gap-1 text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Library
                </Link>
            </div>

            <ChangeControlHeader 
                changeControl={changeControl}
                signatureCount={signedCount}
                totalRequired={signatories.length}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <DiffViewer 
                        changeControl={changeControl}
                        oldFileUrl={changeControl.old_file_url}
                        newFileUrl={changeControl.new_file_url}
                    />

                    <DeltaSummaryCard 
                        changeControl={changeControl}
                        onRegenerate={handleRegenerateSummary}
                    />
                </div>

                <div className="space-y-6">
                    <Card className="p-4">
                        <SignatureGrid 
                            signatories={signatories}
                            certificates={signatureCertificates}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            canSign={canSign}
                            onSign={() => setSignModalOpen(true)}
                            onWaive={(userId) => {
                                const signatory = signatories.find(s => s.user_id === userId)
                                setWaiveTarget({ id: userId, name: signatory?.full_name || 'Unknown' })
                                setWaiveModalOpen(true)
                            }}
                            isLocked={changeControl.status === 'complete'}
                        />
                    </Card>
                </div>
            </div>

            <SignatureConfirmModal
                open={signModalOpen}
                onOpenChange={setSignModalOpen}
                changeControlId={changeControl.id}
                sopTitle={changeControl.sops?.title || ''}
                newVersion={changeControl.new_version}
                ccRef={ccRef}
                signatureUrl={currentUserProfile.signature_url}
                onSuccess={() => setRefreshKey(k => k + 1)}
            />

            <WaiveModal
                open={waiveModalOpen}
                onOpenChange={setWaiveModalOpen}
                changeControlId={changeControl.id}
                targetUserName={waiveTarget?.name || ''}
                ccRef={ccRef}
                onSuccess={() => setRefreshKey(k => k + 1)}
            />
        </div>
    )
}

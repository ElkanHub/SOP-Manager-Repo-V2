"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChangeControlHeader } from "@/components/change-control/change-control-header"
import { DiffViewer } from "@/components/change-control/diff-viewer"
import { DeltaSummaryCard } from "@/components/change-control/delta-summary-card"
import { SignatureGrid } from "@/components/change-control/signature-grid"
import { SignatureConfirmModal } from "@/components/change-control/signature-confirm-modal"
import { WaiveModal } from "@/components/change-control/waive-modal"
import { signChangeControl, waiveSignature, generateDeltaSummary } from "@/actions/sop"
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
    changeControl: initialChangeControl,
    signatureCertificates: initialCerts,
    currentUserId,
    currentUserProfile,
    isAdmin,
    canSign,
}: ChangeControlClientProps) {
    const [changeControl, setChangeControl] = useState(initialChangeControl)
    const [signatureCertificates, setSignatureCertificates] = useState(initialCerts)
    const [signModalOpen, setSignModalOpen] = useState(false)
    const [waiveModalOpen, setWaiveModalOpen] = useState(false)
    const [waiveTarget, setWaiveTarget] = useState<{ id: string; name: string } | null>(null)

    const signatories = changeControl.required_signatories as CcSignatory[] || []
    const signedCount = signatories.filter(s => {
        const cert = signatureCertificates.find(c => c.user_id === s.user_id)
        return cert || s.waived
    }).length

    const ccRef = `CC-${new Date(changeControl.created_at).getFullYear()}-${changeControl.id.slice(0, 4).toUpperCase()}`

    const handleRegenerateSummary = async () => {
        const result = await generateDeltaSummary(changeControl.id)
        if (result.success && result.summary) {
            return result.summary
        }
    }

    return (
        <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/10">
            {/* Top Navigation Strip */}
            <div className="border-b bg-background/50 backdrop-blur-md sticky top-0 z-10 px-4 sm:px-6 py-3">
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <Link href="/library" className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-brand-navy transition-colors">
                        <div className="p-1 rounded-md group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        Back to SOP Library
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-1 border rounded-full">
                            Operational Signature Workflow
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <ChangeControlHeader 
                    changeControl={changeControl}
                    signatureCount={signedCount}
                    totalRequired={signatories.length}
                />

                <div className="mt-8 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Left: Main Content (Diff & AI) */}
                    <div className="xl:col-span-8 space-y-8">
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold tracking-tight text-foreground">Change Impact Review</h2>
                            </div>
                            <DiffViewer 
                                changeControl={changeControl}
                                oldFileUrl={changeControl.old_file_url}
                                newFileUrl={changeControl.new_file_url}
                            />
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">AI Intelligence Summary</h2>
                            <DeltaSummaryCard 
                                changeControl={changeControl}
                                onRegenerate={handleRegenerateSummary}
                            />
                        </section>
                    </div>

                    {/* Right: Governance (Signatures) */}
                    <div className="xl:col-span-4 sticky top-24 space-y-6">
                        <div className="bg-card rounded-2xl border border-border/40 shadow-xl overflow-hidden">
                            <div className="p-6">
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
                            </div>
                        </div>

                        <div className="p-6 bg-brand-navy/5 dark:bg-brand-navy/10 rounded-2xl border border-brand-navy/10">
                            <h4 className="text-xs font-bold text-brand-navy dark:text-brand-teal uppercase tracking-widest mb-2">Governance Note</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Once all required department managers have cryptographically signed this record, the SOP will automatically transition to "Active" status and the document version will be updated system-wide.
                            </p>
                        </div>
                    </div>
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
                onSuccess={() => window.location.reload()} // Re-fetch data on success
            />

            <WaiveModal
                open={waiveModalOpen}
                onOpenChange={setWaiveModalOpen}
                changeControlId={changeControl.id}
                targetUserName={waiveTarget?.name || ''}
                ccRef={ccRef}
                onSuccess={() => window.location.reload()} // Re-fetch data on success
            />
        </div>
    )
}

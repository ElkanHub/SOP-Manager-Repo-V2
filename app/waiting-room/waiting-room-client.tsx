"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WaitingRoomClient({ userId }: { userId: string }) {
    const router = useRouter()
    const supabase = createClient()
    const [isChecking, setIsChecking] = useState(false)
    const [approved, setApproved] = useState(false)

    useEffect(() => {
        // Subscribe to changes on their profile row
        const channel = supabase
            .channel(`profile_status_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    if (payload.new.signup_status === 'approved') {
                        setApproved(true)
                        setTimeout(() => {
                            router.refresh()
                        }, 1500)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, router, supabase])

    const handleCheckStatus = async () => {
        setIsChecking(true)
        const { data } = await supabase
            .from('profiles')
            .select('signup_status')
            .eq('id', userId)
            .single()
            
        if (data?.signup_status === 'approved') {
            setApproved(true)
            router.refresh()
        }
        setIsChecking(false)
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border shadow-xl overflow-hidden text-center relative">
                <div className="h-2 w-full bg-gradient-to-r from-brand-teal via-brand-navy to-brand-teal animate-pulse" />
                
                <div className="p-8 pb-10">
                    {approved ? (
                        <div className="animate-in zoom-in duration-500 fade-in flex flex-col items-center">
                            <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight mb-2">Access Granted!</h1>
                            <p className="text-muted-foreground">Transferring you to the onboarding portal...</p>
                            <Loader2 className="h-6 w-6 animate-spin text-brand-teal mt-6" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-6">
                                <ShieldAlert className="h-10 w-10" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight mb-3">Awaiting Administrator Approval</h1>
                            
                            <p className="text-muted-foreground leading-relaxed mb-8">
                                Your account has been successfully created. However, for security purposes, a system administrator must manually verify and approve your access before you can enter the operations system.
                            </p>

                            <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-5 mb-8 w-full text-left">
                                <h3 className="text-sm font-bold text-brand-navy mb-2">Next Steps</h3>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
                                    <li className="flex items-start gap-2">
                                        <span className="text-brand-teal mt-0.5">•</span>
                                        Check your inbox to verify your email address.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-brand-teal mt-0.5">•</span>
                                        Wait for an administrator to activate your account.
                                    </li>
                                </ul>
                            </div>

                            <Button 
                                onClick={handleCheckStatus} 
                                disabled={isChecking}
                                variant="outline" 
                                className="w-full h-12 rounded-xl flex items-center gap-2 group"
                            >
                                <RefreshCw className={`h-4 w-4 text-brand-teal ${isChecking ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                {isChecking ? 'Checking status...' : 'Refresh Access Status'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

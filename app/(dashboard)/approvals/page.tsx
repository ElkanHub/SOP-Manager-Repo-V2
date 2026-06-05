import { redirect } from 'next/navigation'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { ApprovalQueueTable } from '@/components/approvals/approval-queue-table'
import { ClipboardCheck } from 'lucide-react'

export default async function ApprovalsPage() {
    const supabase = await createClient()
    const serviceClient = await createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        redirect('/login?reason=inactive')
    }

    const { data: isQa } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })

    const isDepartmentManager = profile.role === 'manager'

    if (!isQa && !isDepartmentManager) {
        redirect('/dashboard')
    }

    let approvalQuery = serviceClient
        .from('sop_approval_requests')
        .select(`
            *,
            profiles!inner(id, full_name, avatar_url, department),
            sops!inner(id, sop_number, title, department, status, training_deadline, document_level)
        `)
        .order('created_at', { ascending: false })

    if (isQa) {
        approvalQuery = approvalQuery.eq('approval_stage', 'qa_review')
    } else {
        approvalQuery = approvalQuery.eq('approval_stage', 'hod_review').eq('sops.department', profile.department)
    }

    const { data: approvalRequests, error } = await approvalQuery

    const { data: pendingTrainingSops } = isQa
        ? await serviceClient
            .from('sops')
            .select('id, sop_number, title, department, status, training_deadline, approved_date, effective_date, document_level')
            .eq('status', 'approved_pending_training')
            .order('training_deadline', { ascending: true })
        : { data: [] as any[] }

    if (error) {
        console.error('Error fetching approval requests:', error)
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* <div>
                <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
                <p className="text-muted-foreground">Review and approve SOP submissions</p>
            </div> */}
            {/* Page Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
                <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Approval Queue</h1>
                        <p className="text-muted-foreground">Review and approve SOP submissions</p>
                    </div>
                </div>
            </div>

            <ApprovalQueueTable
                requests={approvalRequests || []}
                currentUserId={user.id}
                mode={isQa ? 'qa' : 'hod'}
                pendingTrainingSops={pendingTrainingSops || []}
            />
        </div>
    )
}

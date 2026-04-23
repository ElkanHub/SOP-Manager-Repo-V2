import { redirect, notFound } from 'next/navigation'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { ApprovalDetailClient } from './approval-detail-client'

interface Props {
    params: Promise<{ id: string }>
}

export default async function ApprovalDetailPage({ params }: Props) {
    const { id } = await params
    
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

    const { data: approvalRequest } = await serviceClient
        .from('sop_approval_requests')
        .select(`
            *,
            profiles(id, full_name, avatar_url, department, role),
            sops(id, sop_number, title, department, version, status)
        `)
        .eq('id', id)
        .single()

    if (!approvalRequest) {
        notFound()
    }

    const isSubmitterView = approvalRequest.submitted_by === user.id
    if (!isQa && !isSubmitterView) {
        redirect('/dashboard')
    }
    const mode: 'reviewer' | 'submitter' = isQa ? 'reviewer' : 'submitter'

    // Convert the raw DB storage path into a secure Microsoft Web Viewer compatible 1-hour signed URL.
    let signedFileUrl = approvalRequest.file_url
    if (signedFileUrl) {
        const { data: signed } = await serviceClient.storage
            .from('documents')
            .createSignedUrl(signedFileUrl, 3600)
        
        if (signed?.signedUrl) {
            signedFileUrl = signed.signedUrl
        }
    }

    const clientApprovalRequest = {
        ...approvalRequest,
        file_url: signedFileUrl
    }

    const isSelfSubmission = approvalRequest.profiles?.id === user.id

    const { data: allRequestsForSop } = await serviceClient
        .from('sop_approval_requests')
        .select(`
            *,
            profiles(id, full_name, avatar_url)
        `)
        .eq('sop_id', approvalRequest.sops?.id)
        .order('created_at', { ascending: true })

    const { data: comments } = await serviceClient
        .from('sop_approval_comments')
        .select(`
            *,
            profiles(id, full_name, avatar_url)
        `)
        .eq('request_id', id)
        .order('created_at', { ascending: true })

    return (
        <ApprovalDetailClient
            approvalRequest={clientApprovalRequest}
            allRequestsForSop={allRequestsForSop || []}
            comments={comments || []}
            currentUserId={user.id}
            isSelfSubmission={isSelfSubmission}
            mode={mode}
        />
    )
}

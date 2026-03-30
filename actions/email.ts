import { Resend } from 'resend'
import { buildEmailTemplate } from '@/lib/email-templates'
import { headers } from 'next/headers'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function getAppUrl() {
    const headerList = await headers()
    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || 'http'
    return `${protocol}://${host}`
}

export async function sendApprovalEmail(
    targetEmail: string,
    targetName: string
) {
    if (!resend) {
        console.warn('[Email] RESEND_API_KEY is not configured. Skipping email.')
        return { success: false, error: 'Email delivery not configured' }
    }

    // ── DEBUG: confirm key is loading ─────────────────────────────
    console.log('[Email] API key present:', !!process.env.RESEND_API_KEY)
    console.log('[Email] Sending approval email to:', targetEmail)
    // ─────────────────────────────────────────────────────────────

    try {
        const appUrl = await getAppUrl()

        const html = buildEmailTemplate({
            title: 'Your Account is Approved',
            messageHtml: `
                <p>Hello <strong>${targetName}</strong>,</p>
                <p>Great news! A system administrator has reviewed and approved 
                your access request to the SOP-Guard Pro operations system.</p>
                <p>You can now log in to complete your onboarding and access 
                your assigned procedures and dashboard.</p>
            `,
            buttonText: 'Complete Setup',
            buttonUrl: `${appUrl}/onboarding`,
        })

        const { data, error } = await resend.emails.send({
            from: 'SOP-Guard Pro <onboarding@resend.dev>',
            // ── TESTING: replace with the email registered on your Resend account
            // Once you verify a custom domain, switch back to: to: targetEmail
            to: 'your-resend-account-email@gmail.com',
            subject: 'Your SOP-Guard Pro access has been approved',
            html,
        })

        if (error) {
            console.error('[Email] Resend delivery failed:', error)
            return { success: false, error: error.message }
        }

        console.log('[Email] Approval email sent successfully. Resend ID:', data?.id)
        return { success: true, data }

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[Email] Failed to send approval email:', message)
        return { success: false, error: message }
    }
}

export async function sendPulseEmail({
    to,
    subject,
    title,
    message,
    buttonText,
    buttonUrl,
}: {
    to: string | string[]
    subject: string
    title: string
    message: string
    buttonText?: string
    buttonUrl?: string
}) {
    if (!resend) {
        console.warn('[Email] RESEND_API_KEY is not configured. Skipping pulse email.')
        return { success: false, error: 'Resend not configured' }
    }

    // ── DEBUG ──────────────────────────────────────────────────────
    console.log('[Email] Sending pulse email. Subject:', subject)
    console.log('[Email] Intended recipient(s):', to)
    // ──────────────────────────────────────────────────────────────

    try {
        const appUrl = await getAppUrl()

        const html = buildEmailTemplate({
            title,
            messageHtml: `<div style="white-space: pre-wrap;">${message}</div>`,
            buttonText: buttonText || 'View Dashboard',
            buttonUrl: buttonUrl || `${appUrl}/dashboard`,
        })

        const { data, error } = await resend.emails.send({
            from: 'SOP-Guard Pro <onboarding@resend.dev>',
            // ── TESTING: replace with the email registered on your Resend account
            // Once you verify a custom domain, switch back to: to
            to: 'your-resend-account-email@gmail.com',
            subject: `[SOP-Guard Pro] ${subject}`,
            html,
        })

        if (error) {
            console.error('[Email] Pulse email delivery failed:', error)
            return { success: false, error: error.message }
        }

        console.log('[Email] Pulse email sent successfully. Resend ID:', data?.id)
        return { success: true, data }

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[Email] Failed to send pulse email:', message)
        return { success: false, error: message }
    }
}
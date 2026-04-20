import nodemailer from 'nodemailer'
import { buildEmailTemplate } from '@/lib/email-templates'
import { headers } from 'next/headers'

const transport = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io",
    port: parseInt(process.env.MAILTRAP_PORT || "2525", 10),
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
    }
})

const defaultFrom = process.env.MAILTRAP_FROM_EMAIL || 'onboarding@example.com'

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
    if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
        console.warn('[Email] Mailtrap credentials not configured. Skipping email.')
        return { success: false, error: 'Email delivery not configured' }
    }

    // ── DEBUG: confirm credentials are loading ─────────────────────────────
    console.log('[Email] Mailtrap configured:', !!process.env.MAILTRAP_USER)
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

        const info = await transport.sendMail({
            from: `SOP-Guard Pro <${defaultFrom}>`,
            to: targetEmail,
            subject: 'Your SOP-Guard Pro access has been approved',
            html,
        })

        console.log('[Email] Approval email sent successfully. Message ID:', info.messageId)
        return { success: true, data: { id: info.messageId } }

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
    if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
        console.warn('[Email] Mailtrap credentials not configured. Skipping pulse email.')
        return { success: false, error: 'Mailtrap not configured' }
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

        const info = await transport.sendMail({
            from: `SOP-Guard Pro <${defaultFrom}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: `[SOP-Guard Pro] ${subject}`,
            html,
        })

        console.log('[Email] Pulse email sent successfully. Message ID:', info.messageId)
        return { success: true, data: { id: info.messageId } }

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.error('[Email] Failed to send pulse email:', message)
        return { success: false, error: message }
    }
}
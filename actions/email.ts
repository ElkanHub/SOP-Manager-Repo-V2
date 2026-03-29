import { Resend } from 'resend'
import { buildEmailTemplate } from '@/lib/email-templates'
import { headers } from 'next/headers'

// Only initialize if the key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendApprovalEmail(
    targetEmail: string,
    targetName: string
) {
    if (!resend) {
        console.warn("RESEND_API_KEY is not configured. Skipping approval email delivery.")
        return { success: false, error: "Email delivery not configured" }
    }

    try {
        const headerList = await headers()
        const host = headerList.get('host')
        const protocol = headerList.get('x-forwarded-proto') || 'http'
        const appUrl = `${protocol}://${host}`

        const html = buildEmailTemplate({
            title: "Your Account is Approved",
            messageHtml: `
                <p>Hello <strong>${targetName}</strong>,</p>
                <p>Great news! A system administrator has reviewed and approved your access request to the SOP-Guard Pro operations system.</p>
                <p>You can now log in to the dashboard to view your assigned training manuals, operational procedures, and dashboard pulse notifications.</p>
            `,
            buttonText: "Access Dashboard",
            buttonUrl: `${appUrl}/login`
        })

        const { data, error } = await resend.emails.send({
            from: 'SOP-Guard Pro <system@updates.sop-guard.com>', // MUST BE verified domain or use Resend testing domain
            to: targetEmail,
            subject: 'Account Action Required: Your Access is Approved',
            html: html,
        })

        if (error) {
            console.error("Resend delivery failed:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data }

    } catch (e: any) {
        console.error("Failed to construct or send approval email:", e)
        return { success: false, error: e.message }
    }
}

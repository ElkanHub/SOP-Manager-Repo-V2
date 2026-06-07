# SOP-Guard Pro — Route & Page Directory

This document provides a comprehensive map of all frontend pages and backend API routes currently implemented in the application.

## Frontend Pages (App Router)

| Route Path | File Location | Purpose |
|------------|---------------|---------|
| `/` | `app/page.tsx` | Main proxy redirect / Entry point |
| `/login` | `app/(auth)/login/page.tsx` | User login portal |
| `/signup` | `app/(auth)/signup/page.tsx` | New user registration |
| `/setup` | `app/(auth)/setup/page.tsx` | Initial system administrator setup |
| `/onboarding` | `app/(auth)/onboarding/page.tsx` | User profile & signature wizard |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Passwod reset request |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Password update entry |
| `/waiting-room` | `app/waiting-room/page.tsx` | Post-signup approval holding area |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Operations Centre / Executive Overview |
| `/library` | `app/(dashboard)/library/page.tsx` | Master SOP Library index |
| `/library/[id]` | `app/(dashboard)/library/[id]/page.tsx` | SOP Viewer & Version History |
| `/approvals` | `app/(dashboard)/approvals/page.tsx` | My Pending Approvals queue |
| `/approvals/[id]` | `app/(dashboard)/approvals/[id]/page.tsx` | Detailed Approval/Signing workspace |
| `/change-control/[id]` | `app/(dashboard)/change-control/[id]/page.tsx` | Change Control Delta inspection & Signing |
| `/equipment` | `app/(dashboard)/equipment/page.tsx` | Asset & Equipment Registry |
| `/equipment/[id]` | `app/(dashboard)/equipment/[id]/page.tsx` | Asset Detail & Maintenance Schedule |
| `/calendar` | `app/(dashboard)/calendar/page.tsx` | Operational Scheduled Maintenance Calendar |
| `/messages` | `app/(dashboard)/messages/page.tsx` | Internal Threaded Communications |
| `/messages/[id]` | `app/(dashboard)/messages/[id]/page.tsx` | Active Conversation screen |
| `/reports` | `app/(dashboard)/reports/page.tsx` | Audit Logs & Compliance Reporting |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Profile, Notifications & Admin Controls |
| `/docs` | `app/(docs)/docs/page.tsx` | Documentation Index |
| `/docs/[...slug]` | `app/(docs)/docs/[...slug]/page.tsx` | Dynamic Documentation Pages |

## Backend API Routes & Webhooks

| API Endpoint | Purpose |
|--------------|---------|
| `/api/change-control/diff` | Generates HTML-based diffs for CC review |
| `/api/gemini/delta-summary` | AI-powered SOP revision analysis |
| `/api/gemini/risk-insights` | AI-powered equipment risk profiling |
| `/api/storage/sop-upload` | Handles multi-part raw DOCX uploads |
| `/api/storage/equipment-photo` | Handles asset image processing |
| `/api/cron/overdue-check` | Automated batch check for overdue PMs |
| `/api/cron/pm-alerts` | Dispatches pending maintenance pulse alerts |
| `/api/docs/proxy` | Remote documentation retrieval |
| `/api/docs/search` | Full-text search for the documentation hub |
| `/auth/callback` | Supabase OAuth & Magic Link callback handler |

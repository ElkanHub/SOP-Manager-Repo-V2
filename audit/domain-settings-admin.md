# Audit — Settings + Admin user management + Email/notification wiring + Audit log + PWA/offline

Scope: `app/(dashboard)/settings/*`, `components/settings/*`, `actions/settings.ts`, `actions/email.ts`,
`lib/email-templates.ts`, `actions/audit.ts`, `lib/audit.ts`, migration 040, `components/pwa/*`,
`lib/pwa/*`, `lib/sync/*`, `app/sw.ts`, `app/offline/*`, `app/api/pwa/push-subscription/route.ts`, migration 049.

Verdict: Most flows are genuinely wired end-to-end (approve/reject/deactivate persist and are enforced at
`proxy.ts`; audit_log is append-only and written on key actions; PWA push is real, not a stub; sync queue is real).
The real problems are concentrated in **email delivery configuration**, one **dead notification toggle**, and a few
**silent-failure / UX gaps**.

---

## CRITICAL

### C1. Email provider defaults to Mailtrap *sandbox* — production emails are silently delivered nowhere
- **Location:** `actions/email.ts:5-14`
- **What's wrong:** The nodemailer transport hardcodes `host: process.env.MAILTRAP_HOST || "sandbox.smtp.mailtrap.io"`, port `2525`, and `from: 'onboarding@example.com'`. Mailtrap's `sandbox.*` host **captures mail in a test inbox and never delivers to real recipients**. If `MAILTRAP_*` envs are set to sandbox creds (the documented default), every "real" email — account-approval notice, all Pulse broadcast/notice emails (`actions/pulse.ts`, `actions/sop.ts`, `actions/equipment.ts`) — is accepted and swallowed. The code logs `"sent successfully"` with a messageId, so it *looks* fine in logs.
- **Real-world impact:** Approved users never receive the "Your account is approved → Complete Setup" email and may not know to log in; SOP-change / acknowledgement-due / PM / equipment notice emails never arrive. Quality-relevant notifications silently fail with zero operator signal.
- **One-line fix:** Use a real SMTP/transactional provider host in production (env-driven, not the sandbox default) and fail loudly (or surface a banner) when the configured host is a sandbox.

### C2. No password-reset email path exists in this domain; signup-approval is the only transactional email
- **Location:** `actions/email.ts` (only `sendApprovalEmail` + `sendPulseEmail` exist)
- **What's wrong:** The brief asks about reset/signature-request emails. There is **no** `sendPasswordResetEmail`/`sendSignatureRequestEmail` in the email layer — password reset relies entirely on Supabase Auth's built-in mailer (separate SMTP config in the Supabase dashboard), which is *not* the Mailtrap transport audited here. That's fine *if* Supabase SMTP is configured, but it means there are **two independent mail pipelines** and the app-level one (C1) being misconfigured does not visibly affect reset, masking the problem. (needs verification that Supabase project SMTP is set for prod.)
- **Real-world impact:** Operators may "test" password reset (works via Supabase) and wrongly assume all email works, while approval/notice emails (Mailtrap path) are dead.
- **One-line fix:** Document/verify both pipelines; add a startup/health check that asserts the app-level transport targets a deliverable host.

---

## HIGH

### H1. "Pulse Panel Alerts" toggle is a dead setting — persists but is never consulted
- **Location:** toggle in `components/settings/notifications-tab.tsx:88-94`; persisted by `actions/settings.ts:124-146`; **no consumer**. Confirmed: grep for `prefs.pulse` / `notification_prefs.pulse` finds only the settings UI writing/reading it back to itself (`settings-client.tsx:45`, `notifications-tab.tsx:91`).
- **What's wrong:** The Pulse realtime subscription (`components/pulse/the-pulse.tsx`), badge logic (`pulse-wrapper.tsx`), and push dispatch (`sendPwaPushToUsers`) all read `notice_sound` / `message_sound` but **never** read `notification_prefs.pulse`. Turning "Pulse Panel Alerts" off changes nothing — notices and the badge still appear.
- **Real-world impact:** User disables in-app alerts, UI confirms "saved", alerts keep coming. Broken expectation; trust-eroding.
- **One-line fix:** Gate Pulse item rendering/badge counting (and optionally push) on `prefs.pulse !== false`, or remove the toggle.

### H2. `sequence_padding` input physically cannot hold the required 2–8 value range correctly
- **Location:** `components/settings/departments-tab.tsx:161` — `onChange={(e) => setSequencePadding(e.target.value.replace(/\D/g, '').slice(0, 1))}`
- **What's wrong:** The input is sliced to a **single digit**, so the only enterable values are 0–9. Server validation (`actions/settings.ts:39-41`) requires `>= 2 && <= 8`. A 2-digit padding (e.g. 10) is impossible to enter, and entering 0 or 1 yields a server error with no inline hint until save. Combined with `numberingSettings?.sequence_padding || 3` (line 54), a legitimately stored padding could only ever be a single digit anyway.
- **Real-world impact:** Admins cannot configure padding wider than 9; confusing validation failures on 0/1. Document-numbering config is effectively crippled at the UI layer.
- **One-line fix:** Allow 1–2 chars (`.slice(0, 2)`) or use a numeric Select of 2–8; clamp client-side to the valid range.

### H3. Notice/notice-email recipient lookup loads the **entire** auth user list per broadcast
- **Location:** `actions/pulse.ts:103` (`service.auth.admin.listUsers()` with no paging) — same pattern likely at `actions/pulse.ts:320` and the sop/equipment notice paths.
- **What's wrong:** To resolve recipient emails it calls `auth.admin.listUsers()` which defaults to ~50 users per page (no `perPage`/loop). On any tenant with >50 users, recipients beyond the first page are silently dropped from the email blast (the in-app Pulse row is fine; only email is truncated). `app/(dashboard)/settings/page.tsx:77` correctly uses `{ perPage: 1000 }`, proving the author knew — the pulse path forgot.
- **Real-world impact:** On a real-sized org, broadcast/notice **emails** reach only an arbitrary ~50 users; the rest get no email and there is no error.
- **One-line fix:** Pass `{ perPage: 1000 }` (and page if needed), or fetch emails by `id` directly rather than listing all users.

---

## MEDIUM

### M1. `getAppUrl()` depends on `headers()` — email links break in any non-request context
- **Location:** `actions/email.ts:16-21`, used by both `sendApprovalEmail` and `sendPulseEmail`.
- **What's wrong:** Button URLs are derived from the incoming request's `host`/`x-forwarded-proto` via `next/headers`. Approval emails today are only sent from a user-initiated server action (has headers), so it works. But `sendPulseEmail` is also invoked from flows that could run server-side without a browser request; if email sending is ever moved to a cron/queue, `headers()` will throw or yield a wrong/internal host, producing broken `Complete Setup`/`View Dashboard` links. (No cron currently calls it — `app/api/cron/*` has no email usage — so latent, not active.)
- **Real-world impact:** Latent: email CTAs would 404 or point to an internal host if dispatch context changes.
- **One-line fix:** Prefer an explicit `NEXT_PUBLIC_APP_URL`/`SITE_URL` env, falling back to headers only when present.

### M2. Email-template logo is a placeholder image
- **Location:** `lib/email-templates.ts:31` — `logoUrl: "https://via.placeholder.com/150x40/...?text=SOP-GUARD+PRO"`
- **What's wrong:** Every email renders a third-party placeholder.com image as the brand logo. Also the brand name is `"SOP-Guard Pro"` while the app UI is branded `"QMS-MANAJA"` (see settings/page metadata, toasts) — inconsistent product name in customer-facing mail.
- **Real-world impact:** Unbranded/broken-looking emails (placeholder.com may be blocked or disappear); brand-name mismatch undermines trust.
- **One-line fix:** Host a real logo and align the email brand name with the app.

### M3. Pending-user Reject is silent and offers no path back
- **Location:** `actions/settings.ts:574-595` (`rejectUser` sets `signup_status='rejected', is_active=false`); UI `components/settings/users-tab.tsx:303-314`.
- **What's wrong:** Rejection deactivates the account and sets status `rejected`, but **no email is sent** to the applicant (unlike approval), and there is no admin affordance to later re-approve a rejected user (they fall out of the `pending` list and into inactive; `reactivateUser` flips `is_active` but leaves `signup_status='rejected'`, so `proxy.ts:74` immediately bounces them to `/login?reason=inactive` on next request... actually once reactivated they pass, but status stays `rejected` which no logic reads — harmless but messy).
- **Real-world impact:** Rejected applicant gets no notification and just silently can't log in; admin has no clean "undo rejection" button.
- **One-line fix:** Send a rejection notice (optional) and add an explicit re-approve action that resets `signup_status` to `pending`/`approved`.

### M4. Reject button doesn't reflect result; both pending buttons ignore `result.error`
- **Location:** `components/settings/users-tab.tsx:294-313`
- **What's wrong:** `approveUser`/`rejectUser` are awaited and only the **success** branch updates local state; on failure (`result.success === false`) nothing is shown — no toast, no error. The spinner just stops and the row stays pending. (Contrast: dept/role changes do toast on error.)
- **Real-world impact:** If approve/reject fails (e.g. transient RLS/network), admin sees no feedback and assumes it worked.
- **One-line fix:** `if (!result.success) toast.error(result.error)` in both handlers.

### M5. Department add uses optimistic `crypto.randomUUID()` row that won't match the real DB id until reload
- **Location:** `components/settings/departments-tab.tsx:85-88`
- **What's wrong:** After `addDepartment` succeeds the client appends a row with a **fabricated** `id`. Subsequent edit/delete on that fabricated row before a page refresh will target a non-existent id (delete/update by id no-ops or errors). The comment even admits "re-fetch would need a router.refresh()".
- **Real-world impact:** Edit/delete of a just-created department in the same session silently fails or hits the wrong row until the page is reloaded.
- **One-line fix:** Return the inserted row from the action and use its real id, or `router.refresh()` after add.

---

## LOW

### L1. Confusing `email:id` alias in `getActiveUser`
- **Location:** `actions/settings.ts:54` — `.select('id, is_active, is_admin, department, role, email:id')`
- **What's wrong:** `email:id` aliases the profile's `id` column as `email` (profiles has no email column). The value is never used, but it's misleading and would silently misfeed any future consumer expecting a real email.
- **Fix:** Drop the `email:id` alias.

### L2. Redundant double `auth.getUser()` in several settings actions
- **Location:** `actions/settings.ts:64-92, 94-120, 124-146` — each calls `getActiveUser()` (which calls `getUser()`) and then immediately calls `createClient().auth.getUser()` again.
- **What's wrong:** Two JWT revalidation round-trips per call; harmless but wasteful. The `ctx.user` from `getActiveUser` is already available.
- **Fix:** Reuse `ctx.user`.

### L3. `updateDepartmentColour` is dead code
- **Location:** `actions/settings.ts:185-194` — exported but the UI only calls `updateDepartmentDetails` (colour+code together). No caller found.
- **Fix:** Remove or wire up; minor.

---

## Things verified as GOOD (not findings)
- **Deactivate truly revokes access:** `deactivateUser` sets `is_active=false` and calls `service.auth.admin.signOut(targetUserId)`; `proxy.ts:74-78` redirects any inactive user to `/login?reason=inactive` on the next request. Real enforcement, not cosmetic.
- **Audit trail is append-only and actually written:** migration `040_audit_log_hardening.sql` adds RESTRICTIVE deny-all INSERT/UPDATE/DELETE policies (service role bypasses to write); `lib/audit.ts` is fire-and-forget by design; settings mutations (role/dept/admin grant/revoke/deactivate/approve/reject/numbering) all insert audit rows.
- **PWA push is real, not a stub:** `lib/pwa/push-server.ts` sends via `web-push` with VAPID; `app/sw.ts` has real `push`/`notificationclick` handlers + app-badge; subscription persisted via `/api/pwa/push-subscription` (auth-gated, RLS in migration 049); expired (404/410) subs deactivated.
- **Offline reachable:** `/offline` is force-precached (`app/sw.ts:107-109`) and registered as the document fallback.
- **Offline sync is real:** `lib/sync/sync-engine.ts` drains an IndexedDB queue with retry/abandon + last-write-wins; message handler replays `sendMessage`.
- **Admin actions are server-enforced:** every admin mutation goes through `assertAdmin()` / `requireAdmin()` re-checking `is_admin && is_active` via the service client — not trusting the client.
- **Email/sound prefs (except `pulse`) take effect:** `notification_prefs->email` filters email recipients in pulse/sop/equipment; `notice_sound`/`message_sound` gate chimes in `the-pulse.tsx`, `pulse-wrapper.tsx`, `app-sidebar.tsx`.
- **Grant/Revoke admin require password re-auth** (`grantAdmin`/`revokeAdmin` via `signInWithPassword`) and block self-modification.

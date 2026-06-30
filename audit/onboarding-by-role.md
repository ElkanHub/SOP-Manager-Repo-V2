# Onboarding / Sign-up / Auth Flow Audit — by Role

Scope: invite/signup → email verification → approval → onboarding → first landing screen, for every effective persona. Adversarial trace by reading code. Date: 2026-06-24.

## Flow summary (as built)

1. **First admin** is bootstrapped at `/setup` via `createFirstAdmin` (service role). It calls `supabase.auth.admin.createUser({ email_confirm: true })`, then UPDATEs the auto-created profile to `department='QA', role='manager', is_admin=true, is_active=true, onboarding_complete=false, signup_status='approved'`, then `redirect('/login?setup=success')`. (`actions/auth.ts:22-99`)
2. **Everyone else** signs up at `/signup` via `signupUser` → `supabase.auth.signUp` with `emailRedirectTo=/auth/callback?next=/onboarding` and `data.full_name`. (`actions/auth.ts:124-152`)
3. A DB trigger `on_auth_user_created → handle_new_user()` inserts the profile with `department=NULL, role=NULL, is_active=true, onboarding_complete=false, signup_status='pending'` and Pulse-notifies all `is_admin=true` users. (`supabase/migrations/030_signup_pulse.sql`)
4. Email link hits `/auth/callback` which exchanges the code and redirects to `next` (`/onboarding`) with `welcome=1`. (`app/auth/callback/route.ts`)
5. `proxy.ts` gates every request: inactive → `/login?reason=inactive`; `pending` → `/waiting-room`; `approved && !onboarding_complete` → `/onboarding`; `approved && onboarding_complete` → `/dashboard`. (`proxy.ts:57-91`)
6. Admin approves/rejects in **Settings → Users tab** (`approveUser`/`rejectUser` in `actions/settings.ts:543-595`, UI in `components/settings/users-tab.tsx`). Both are `assertAdmin`-gated.
7. Onboarding wizard (4 steps) sets dept+role (`saveStepOne`), profile fields (`saveStepTwo`), signature upload, then `completeSetup` sets `onboarding_complete=true` and redirects to `/dashboard`. (`components/onboarding/*`, `actions/onboarding.ts`, `actions/onboarding-complete.ts`)

The core happy path is sound: there **is** a working approval UI, onboarding persists, and the proxy state machine is internally consistent. No global redirect-loop or "stuck forever" defect was found. The findings below are the real edge-case and design problems.

---

## Findings

### HIGH

#### H1. New user's email-verification link lands on `/onboarding`, which immediately bounces to `/waiting-room` — confusing dead-end until approval
- **Location:** `actions/auth.ts:140` (`emailRedirectTo=.../auth/callback?next=/onboarding`) + `proxy.ts:79`.
- **What's wrong:** A brand-new signup is `signup_status='pending'`. The email confirmation link is hard-coded to `next=/onboarding`. After `exchangeCodeForSession`, the callback redirects to `/onboarding?welcome=1`, but the proxy sees `pending` and rewrites to `/waiting-room`. So clicking "confirm your email" never shows an onboarding screen and never shows any "email confirmed" acknowledgement — it dumps the user into the waiting room with no signal that verification succeeded. The waiting-room copy still says "Check your inbox to verify your email address," so a verified user is told to verify again.
- **Real-world impact:** Every non-admin user experiences a confusing verification step; support churn. Not blocking (they do reach waiting-room), hence High not Critical.
- **One-line fix:** Set `next=/waiting-room` for signup confirmation (or have `/auth/callback` route by profile state), and drop the "verify your email" bullet once `email_confirmed_at` is set.

#### H2. Rejected user has no terminal screen and gets the same message as a deactivated user
- **Location:** `actions/settings.ts:574-595` (`rejectUser` sets `signup_status='rejected', is_active=false`) + `proxy.ts:74-78` + `components/login-form.tsx:76-80`.
- **What's wrong:** Rejection only flips `is_active=false`. On next login the proxy sees `!is_active` and redirects to `/login?reason=inactive`, which renders "Your account has been **deactivated**. Contact your administrator." There is no `signup_status==='rejected'` branch anywhere in the proxy or UI, so a rejected applicant is told they were "deactivated" (implying they once had access). The `'rejected'` status is essentially dead state — nothing else reads it.
- **Real-world impact:** Misleading messaging for rejected applicants; the distinct `rejected` status is never surfaced. Low security risk but real UX/audit confusion.
- **One-line fix:** Add a `reason=rejected` branch and copy ("Your access request was declined"), keyed off `signup_status==='rejected'`.

#### H3. Setup guard uses a different predicate than the rest of the system — `count(profiles) > 0` vs `has_any_admin()`
- **Location:** `app/(auth)/setup/page.tsx:13-16` (`count > 0` on ALL profiles) vs `proxy.ts:51-56` and `actions/auth.ts:26` (both `has_any_admin()` = active admin exists).
- **What's wrong:** Three different gates guard `/setup`:
  - Page server component: locks if **any** profile row exists.
  - Proxy + `createFirstAdmin`: lock only if an **active admin** exists.
  These disagree. If all admins are deactivated (`is_admin` true but `is_active=false`) or the only profiles are non-admin pending users, `has_any_admin()` returns false → the proxy and `createFirstAdmin` would allow `/setup`, but the page guard (`count>0`) redirects to `/login`, so the page can't render. Conversely if an admin exists but other code paths relied on the page guard, they diverge. The page guard is also a full-table read on every `/setup` hit.
- **Real-world impact:** In a "lost all admins" recovery scenario the bootstrap is half-open/half-closed and behaves inconsistently; hard to reason about. (needs verification of the exact recovery scenario in production data.)
- **One-line fix:** Use `has_any_admin()` RPC in `setup/page.tsx` too, matching the proxy and the action.

### MEDIUM

#### M1. Google OAuth signups bypass the "approval" mental model only via metadata; profile still pending but full_name may be blank
- **Location:** `components/signup-form.tsx:54-73` / `components/login-form.tsx:45-64` (`signInWithOAuth`), `handle_new_user()` reads `raw_user_meta_data->>'full_name'`.
- **What's wrong:** Google sign-in does not pass `data.full_name`; Supabase populates Google's `name` into `raw_user_meta_data` under `full_name`/`name` depending on provider mapping. If the mapping key isn't exactly `full_name`, the trigger inserts `full_name = NULL`. The admin's pending-approval table then shows a blank name, and migration 030's Pulse body becomes `" has requested access..."`. OAuth users are still correctly `pending` (good), but identifying them for approval may be degraded. (needs verification against live Google claim mapping.)
- **Real-world impact:** Admin can't tell who to approve; degraded but not blocking.
- **One-line fix:** In the trigger, coalesce `full_name` with `name` and `email` (`COALESCE(meta->>'full_name', meta->>'name', NEW.email)`).

#### M2. No "resend verification email" path anywhere
- **Location:** signup success screen `components/signup-form.tsx:75-89`; no resend action exists in `actions/auth.ts`.
- **What's wrong:** If the confirmation email is lost or the link expires (Supabase default 24h), the user has no in-app way to resend. They can re-run signup (which errors "User already registered") or use forgot-password (different token type). Dead-end requiring admin/DB intervention.
- **Real-world impact:** Users with expired/lost links are stuck; support load.
- **One-line fix:** Add a `resendVerification(email)` action calling `supabase.auth.resend({ type: 'signup', email })` and surface a button on the success screen.

#### M3. Onboarding role/department are fully self-selected with no governance
- **Location:** `components/onboarding/dept-role-step.tsx` + `saveStepOne` (`actions/onboarding.ts:6-34`).
- **What's wrong:** During onboarding any approved user freely picks their own `department` and `role` (`manager` or `employee`) with zero approval. A user can self-assign `department='QA', role='manager'`, which `getCapabilities`/`isQaManager` treats as **org-wide oversight and approval authority** (`lib/utils/permissions.ts:8-11,58-66`). Admin approval at signup approves *access*, not *privilege level* — the privileged QA-manager designation is granted by the applicant to themselves. (The QA RPC still blocks self-approval of one's own SOP, but a self-declared QA manager can approve *others'* SOPs.)
- **Real-world impact:** Privilege self-escalation to QA-manager (the sole approval authority in a regulated pharma QMS). This is a meaningful control gap for 21 CFR Part 11-style segregation of duties.
- **One-line fix:** Default onboarding role to `employee` and require admin to grant `manager`/QA-dept in Settings; or re-verify dept/role at approval time.

#### M4. `deactivateUser` has production logic keyed on a literal demo name `'Test Pending User'`
- **Location:** `actions/settings.ts:470-494` and mirrored client-side in `components/settings/users-tab.tsx:346-353`.
- **What's wrong:** Deactivating a user whose `full_name === 'Test Pending User'` does NOT deactivate them — it resets them to `pending/role=employee/dept=null/is_active=true`. This is test scaffolding shipped in a server action. Any real user who happens to be named "Test Pending User" silently won't deactivate; instead they're flipped back into the pending pool while staying active.
- **Real-world impact:** Test/debug code in the offboarding path; a deactivation that doesn't deactivate is an audit/compliance hazard.
- **One-line fix:** Remove the `isTestUser` special-case branch entirely.

### LOW

#### L1. Verbose `console.log` of user IDs / auth state in middleware and callback
- **Location:** `proxy.ts:6,46,67,75,80,84,88,93`; `app/auth/callback/route.ts:19,34,37,41`.
- **What's wrong:** Every request logs pathname, user IDs, active/onboarding flags, and code-presence to server logs. PII/operational noise in production logs.
- **One-line fix:** Gate behind `process.env.NODE_ENV !== 'production'` or remove.

#### L2. `completeSetup` requires a signature but onboarding never enforces dept/role server-side at completion
- **Location:** `actions/onboarding-complete.ts:14-33`.
- **What's wrong:** `completeSetup` only verifies `signature_url` exists before flipping `onboarding_complete=true`. It does not re-check that `department`/`role` were actually saved. The wizard enforces dept/role client-side at step 1, but a crafted direct call to `completeSetup` (with a signature uploaded) could finalize onboarding with `department=NULL, role=NULL`, yielding a user the dashboard renders with no capabilities. The dashboard itself doesn't crash on null role (`getCapabilities` coalesces), so impact is limited to a no-capability account.
- **One-line fix:** In `completeSetup`, also require `profile.department && profile.role`.

#### L3. Waiting-room realtime relies on RLS allowing the user to receive their own profile UPDATE event
- **Location:** `app/waiting-room/waiting-room-client.tsx:15-41`.
- **What's wrong:** Auto-advance on approval depends on Postgres Changes delivering the UPDATE to the pending user. If RLS/publication doesn't expose the row to the still-pending user, the realtime path silently no-ops; the manual "Refresh Access Status" button is the fallback (works). Not a defect per se, but the auto-path is unverified. (needs verification.)
- **One-line fix:** N/A — confirm realtime delivery or rely on the manual refresh (already present).

---

## Per-role onboarding matrix

| Role / persona | How invited / created | Created with (dept / role / is_admin / signup_status / onboarding) | Lands on | First screen works? | Blocking issue |
|---|---|---|---|---|---|
| **First Admin** (bootstrap) | `/setup` → `createFirstAdmin` (service role, `email_confirm:true`) | QA / manager / **true** / approved / false → then onboarding | `/login?setup=success` → login → `/onboarding` → `/dashboard` | Yes | None (must still complete onboarding incl. signature) |
| **Admin** (granted later) | Normal signup, approved, then **Grant Admin** in Settings (`grantAdmin`) | self-chosen dept / self-chosen role / **true after grant** / approved / true | `/dashboard` | Yes | Privilege depends on M3 self-selection before grant |
| **QA Manager** | Signup → admin approves → onboarding self-selects QA + manager | QA / manager / false / approved / true | `/dashboard` (org oversight via `getCapabilities`) | Yes | **M3** self-escalation to approval authority |
| **QA Employee** | Signup → approve → onboarding selects QA + employee | QA / employee / false / approved / true | `/dashboard` (supervisory read cards, no manager actions) | Yes | H1/H2 generic UX |
| **Regular-dept Manager** | Signup → approve → onboarding selects dept + manager | dept / manager / false / approved / true | `/dashboard` | Yes | M3 |
| **Regular-dept Employee** | Signup → approve → onboarding selects dept + employee | dept / employee / false / approved / true | `/dashboard` | Yes | H1 (verification → waiting-room confusion) |
| **Engineering Manager** | Signup → approve → onboarding selects Engineering + manager | Engineering / manager / false / approved / true | `/dashboard` (equipment rights) | Yes | M3 |
| **Engineering Employee** | Signup → approve → onboarding selects Engineering + employee | Engineering / employee / false / approved / true | `/dashboard` (`canManageEquipment` via Eng dept) | Yes | None role-specific |
| **Pending (any, just signed up)** | Signup trigger | NULL / NULL / false / **pending** / false | `/waiting-room` | Yes (manual + realtime refresh) | H1 (email link → waiting-room), needs an admin online to approve |
| **Rejected** | Admin clicks Reject | unchanged / unchanged / false / **rejected** + is_active=false | `/login?reason=inactive` | Renders, but **wrong message** ("deactivated") | **H2** |
| **Deactivated (offboarded)** | Admin Deactivate | is_active=false | `/login?reason=inactive` | Yes | M4 if literally named "Test Pending User" |

### Note on "who can approve"
`approveUser`/`rejectUser` require `is_admin`. `handle_new_user` Pulse-notifies all `is_admin=true` profiles. So as long as ≥1 active admin exists (guaranteed by first-admin bootstrap), pending users can always be approved. There is **no** "stuck forever / no approver" critical defect. If every admin were deactivated, new signups would be stuck in waiting-room — but recovery via `/setup` is then gated by `has_any_admin()` (would allow re-bootstrap) except the page guard `count>0` blocks it (see **H3**).

# SOP Manager v2 — Application Audit

**Date:** 2026-06-24
**Scope:** Full-application, evidence-based audit. Nine parallel domain audits (SOP Library, Approvals/Change Control, Requests/AI Builder, Equipment/Calendar/Cron, Training, Dashboard/Reports/Pulse/Messages, Settings/Admin/Email, plus cross-cutting Onboarding-by-role and Role-access).
**Method:** Every claim traced by reading the actual source. File:line citations throughout. Uncertain items flagged `(needs verification)` and kept out of Critical/High unless independently confirmed.

Per-domain detail lives alongside this file: `domain-library.md`, `domain-approvals-cc.md`, `domain-requests-aibuilder.md`, `domain-equipment-calendar.md`, `domain-training.md`, `domain-dashboard-reports.md`, `domain-settings-admin.md`, `onboarding-by-role.md`, `role-access.md`.

---

## Executive Summary

The application is **substantially more built-out than typical "looks done but isn't" projects** — most core data flows are genuinely wired server-side: dashboard KPIs are real scoped aggregates, the SOP approval RPC enforces QA-only sign-off and blocks self-approval, the signature-completion trigger fires, risk scoring is real, messaging/pulse persist, audit tables are append-only, and deactivation truly revokes access. Credit where due.

But the audit surfaced a **handful of systemic root causes** that, together, mean the app is **not production-ready for a regulated GMP environment.** The many individual symptoms collapse into these patterns:

1. **The entire asynchronous layer is switched off by config.** Email transport points at the Mailtrap **sandbox** (delivers nowhere) and `vercel.json` has an **empty `crons` array**. Every notification, every PM/overdue/training-deadline alert, every "your account is approved" mail, every risk refresh — accepted, logged as "sent," and silently dropped. Two one-line config values disable a whole category of features while the UI claims success. *(Both independently confirmed.)*

2. **Server actions on the service client skip authorization.** Several mutations run through the RLS-bypassing service client and then forget to re-check the caller. The worst is an **unauthenticated signature endpoint** (anyone can sign any Change Control). Change-Control origination and PM-task completion have similar holes. RLS protects direct table access, but these actions are the bypass road around it.

3. **`role === 'admin'` is dead code — the role column never holds `'admin'`.** Identity splits admin into the `is_admin` boolean; `role` is only `manager|employee`. Code that checks `role === 'admin'` (all over `actions/training.ts`) is permanently false, so a pure admin is **locked out of all training management.** The same `is_admin`-vs-`role` confusion drives privilege bugs elsewhere.

4. **The UI capability model diverges from backend enforcement.** `getCapabilities()` shows buttons the server then rejects (Engineering employees + Equipment; managers/employees + Reports tabs they appear entitled to), producing silent failures and dead-ends.

5. **Lifecycle dead-ends and missing reverse paths.** Multiple records can enter states they can't leave or progress: a Change Control for a brand-new document completes but creates no SOP; a training-required CC deadlocks because the new revision can't get a module; equipment has no edit/decommission path; request-form submissions can't be cancelled/withdrawn; `needs_review` is set but never cleared.

6. **Dead buttons and orphaned subsystems make features look finished.** "Submit Edit," "Version History," "Copy SOP Number," equipment "Log PM/Service History," group-chat "Add User/Settings" — all render with no handler. A legacy request system and half the AI-SOP-Builder API surface are wired to nothing yet still drive badges.

**Bottom-line verdict:** **Not ready to ship to a regulated customer.** Two config flips (email + cron) and one security fix (the open signature endpoint) are mandatory before any pilot. Beyond that, the lifecycle dead-ends and dead primary actions will block real users from completing everyday jobs. Estimated to **late-beta**: the skeleton and security posture are largely sound, but the "last mile" of several flagship workflows (Change Control for new docs, AI Builder → Library, training under change control) is not connected.

---

## Findings by Severity

### CRITICAL

**C1 — Email delivery is dead (Mailtrap sandbox); every app email is swallowed**
*Location:* `actions/email.ts:5-14` (host defaults to `sandbox.smtp.mailtrap.io`, from `onboarding@example.com`).
*What's wrong:* The sandbox transport accepts and discards all mail. `sendApprovalEmail`, `sendPulseEmail`, and every notice email "succeed" in logs but reach no inbox. Approved users never receive the "complete setup" mail; broadcast notices never email.
*Impact:* Users don't learn their account was approved, signatories aren't notified, no alert email ever arrives — while the app reports success. In a QMS this is a compliance and adoption failure.
*Fix:* Set real `MAILTRAP_*`/SMTP env to a production provider; fail loudly (don't swallow) on transport error.

**C2 — No cron jobs scheduled; all time-based alerts and state transitions are dead**
*Location:* `vercel.json` → `{"crons":[]}` (confirmed). Handlers exist but nothing invokes them: `app/api/cron/pm-alerts/route.ts`, `overdue-check/route.ts`, `training-deadline-check/route.ts`, `refresh-risk-assessment/route.ts`.
*What's wrong:* PM-due/overdue alerts never fire; overdue PM tasks are **never flipped to `overdue`** (only `overdue-check` does that, `overdue-check/route.ts:46-51`); training-deadline and SOP-review alerts never run; risk snapshots never auto-refresh.
*Impact:* Preventive-maintenance and training-deadline tracking — core GMP obligations — silently don't work. Equipment shows "on time" forever.
*Fix:* Add the four cron entries to `vercel.json` with a secured schedule.

**C3 — `signChangeControl` is unauthenticated and RLS-bypassing**
*Location:* `actions/sop.ts:937-985` (service client; no check that the signer is in `required_signatories`, no status check).
*What's wrong:* Any authenticated user can POST a binding signature against any Change Control id and force stage advancement. The signature audit tables are append-only, so forged signatures are permanent.
*Impact:* Defeats the entire electronic-signature / segregation-of-duties control. A regulated-record integrity violation.
*Fix:* Verify caller ∈ snapshotted `required_signatories` and `status='signatures_pending'` before inserting; run under the user client or re-assert identity.

**C4 — Cron endpoints are unauthenticated outside production**
*Location:* `pm-alerts/route.ts:14-18`, `overdue-check/route.ts:14-18`, `training-deadline-check/route.ts:13-17`, `refresh-risk-assessment/route.ts:18-22` — secret check wrapped in `if (NODE_ENV === 'production')`.
*What's wrong:* On any non-prod/staging host, anyone can hit these to mass-flip PM tasks, spam Pulse, and trigger paid AI generation.
*Impact:* Cost-amplification / DoS / data-tampering on any non-prod deployment.
*Fix:* Enforce the cron secret unconditionally, all environments.

**C5 — Change Control for a brand-new (requested) document completes but creates nothing**
*Location:* `supabase/migrations/053_cc_package_lifecycle.sql:162` (`confirm_cc_reconciliation` does `CONTINUE WHEN doc.document_id IS NULL`); no code path turns a requested new document into a `sops` row.
*What's wrong:* QA runs the full workflow, collects signatures, sees "SOPs activated" — but for a net-new document nothing is ever inserted into `sops`.
*Impact:* The flagship "request a new SOP → controlled creation" path produces a phantom success and no document. Core feature is non-functional for new docs.
*Fix:* In reconciliation, insert a `sops` row (with number/version/file) for `document_id IS NULL` package items.

**C6 — Training-required Change Control deadlocks: the new revision can never get a module**
*Location:* SOP parked at `status='approved_pending_training'` (`053_cc_package_lifecycle.sql:167-176`); CC waits at `pending_training` until assignments hit threshold (`actions/change-control.ts:444-465`, `actions/sop.ts:700-726`). But `createTrainingModule` rejects any SOP not `active` (`actions/training.ts:66`) and the module picker only lists `active` SOPs (`app/(dashboard)/training/page.tsx:41`).
*What's wrong:* The SOP can't go active until training completes, and training can't be authored until the SOP is active. Circular.
*Impact:* Any change control that requires retraining (most of them) hangs permanently. The single most important QMS loop deadlocks.
*Fix:* Allow module creation/assignment against `approved_pending_training` SOPs (or auto-clone the prior module to the new version on reconciliation).

---

### HIGH

**H1 — Admins are silently locked out of all training management (dead `role === 'admin'`)**
*Location:* `actions/training.ts:51,121,188,213,304,350,568,…`, `app/(dashboard)/training/page.tsx:21`. Confirmed: `role` only holds `manager|employee`; `role === 'admin'` is always false.
*What's wrong:* A pure admin (`is_admin=true, role='employee'`) is redirected off `/training` and cannot create/publish/assign/edit any module. Writes go through the service client, so this broken TS check is the only gate that runs.
*Impact:* The highest-privilege account cannot run training. Compare the correct `!profile.is_admin` in `actions/events.ts:32`.
*Fix:* Replace every `role !== 'admin'` / `role === 'admin'` with `!is_admin` / `is_admin`.

**H2 — Any active employee can originate a Change Control package for an arbitrary department**
*Location:* `actions/change-control.ts:145` (`submitChangeControlRequest`) checks only `is_active`; inserts via service client with caller-supplied `originating_department`/`affected_departments`. `change_controls` has no INSERT RLS policy.
*What's wrong:* Provenance is spoofable; no role/dept gate, unlike SOP submission (employee→HOD) and legacy QA-gated CC creation.
*Impact:* Segregation-of-duties / data-integrity hole on controlled change records.
*Fix:* Force `originating_department = profile.department`, require manager/admin, add an INSERT RLS policy.

**H3 — No self-origination guard anywhere in the CC workflow (QA can drive its own CC end-to-end)**
*Location:* `actions/change-control.ts:238/325/388` + `confirm_cc_reconciliation` (`053:145`) gate only on "is QA/admin."
*What's wrong:* A QA manager who raised a CC can screen, draft, approve, sign, and reconcile it alone — bypassing the SOP path's self-approval block.
*Impact:* SoD violation on the change-control approval chain.
*Fix:* Block the originator from screening/approving/reconciling their own CC, mirroring `approve_sop_request`.

**H4 — A CC document can be "approved" for signing with no revised file attached**
*Location:* `set_cc_document_review` (`053:83`) sets `approved` without checking `new_file_url`/`new_revision`; package auto-advances to signatures; reconciliation then skips the empty doc (C5).
*What's wrong:* Signatures get captured against a draft that doesn't exist.
*Impact:* Signed-off "changes" with no actual document. Audit-trail integrity failure.
*Fix:* Require `new_file_url` + `new_revision` before allowing `approved`.

**H5 — "Submit Edit" is a dead button on the SOP detail page and the library table**
*Location:* `app/(dashboard)/library/[id]/library-view-client.tsx:201-207`, `components/library/sop-library-table.tsx:203-210` — render with no handler.
*What's wrong:* The natural place to revise an SOP does nothing. The only working revision entry is the unrelated top-level "Upload SOP → Update Existing" dropdown.
*Impact:* Users believe revision is broken; many will never find the alternate path.
*Fix:* Wire Submit Edit to the existing Update-Existing / change-control entry flow.

**H6 — Library "All" count/list silently drops statuses for non-admins; won't reconcile**
*Location:* `lib/queries/sops.ts:26-39` (hardcoded status whitelist at line 31 when no status filter); count uses `count:'exact'` over the filtered set.
*What's wrong:* Non-admin managers' headline "· N SOPs" excludes any SOP outside the whitelist; it disagrees with Master Index (counts `active` across all departments).
*Impact:* The primary library count is partial and changes meaning per tab — users can't trust totals.
*Fix:* Make the default view's count and list use a consistent, documented status set.

**H7 — Engineering employees see Equipment-management UI the backend always rejects**
*Location:* `lib/utils/permissions.ts:66` grants `canManageEquipment` to all Eng members; UI renders Add/Manage (`equipment/page.tsx:52`, `equipment-client.tsx:43-111`); but `actions/equipment.ts:45-47`, `equipment-photo/route.ts:24-26`, and RLS `011_rls.sql:98` require `role='manager'`.
*What's wrong:* Eng employees fill the whole wizard, then get rejected.
*Impact:* Guaranteed silent-failure dead-end for a whole persona.
*Fix:* Align the action/RLS with `canManageEquipment`, or stop granting `canManage` to Eng employees.

**H8 — No edit / decommission / re-activate path for equipment**
*Location:* `actions/equipment.ts` (no update/delete action); no UPDATE/DELETE RLS in `011_rls.sql:87-98`.
*What's wrong:* Active equipment is permanently frozen — can't fix a serial/frequency/SOP-link or retire a machine; PM tasks generate forever for dead assets.
*Impact:* Registry rots; impossible to correct data or offboard equipment.
*Fix:* Add an update/decommission action + RLS for managers/admin.

**H9 — `needs_review` can be set but never cleared (permanent badge)**
*Location:* set by SOP-version trigger (`supabase/migrations/037_training.sql:244-245`); read in 3 displays + sidebar count (`components/app-sidebar.tsx:212-216`); nothing ever writes it back to `false`.
*What's wrong:* No "Mark Reviewed" UI; the manager/QA sidebar count and pulsing badge are permanent once any linked SOP revises.
*Impact:* Badge fatigue; the signal becomes noise and real review needs get ignored.
*Fix:* Add a review action that clears `needs_review`, or clear on module regeneration.

**H10 — Legacy `document_requests` is dead for input but still drives QA badges**
*Location:* `actions/requests.ts:37` (`submitDocumentRequest`) has no UI callers; sidebar still counts legacy rows (`app-sidebar.tsx:168-171,188-192`); `/requests` and the hub query only the new RFS tables (`app/(dashboard)/requests/page.tsx:27-46`).
*What's wrong:* Any pre-existing legacy row shows a permanent badge pointing to a page that never lists it; the whole legacy action set + `mark_request_*` RPCs are unreachable.
*Impact:* Counts don't reconcile; QA chases phantom requests.
*Fix:* Migrate/close legacy rows and remove them from badge math, or retire the legacy tables.

**H11 — AI usage metering is decorative — recorded, never enforced**
*Location:* `lib/ai/usage.ts:27` only inserts into `ai_usage_events`; migration `056` is an append-only ledger + read-only summary RPC; nothing checks a balance before a call (`lib/ai/client.ts`).
*What's wrong:* No quota/deduction/throttle exists.
*Impact:* Unlimited AI spend; the advertised "quota" can't bill or limit anyone.
*Fix:* Add a pre-call balance check against the ledger, or remove the quota UI.

**H12 — AI SOP Builder output is a dead end (no bridge into the Library)**
*Location:* `components/sop-builder/sop-builder-workspace.tsx` only chats + generate-word + download; no path from `sop_builder_drafts` into `sops`/`sop_approval_requests`.
*What's wrong:* The user must download the `.docx` and re-upload through normal Approvals.
*Impact:* "AI SOP Builder" is a standalone Word generator, not integrated authoring — half the promised value.
*Fix:* Add a "Submit to Library / Start Approval" action that creates the SOP + approval request from the draft.

**H13 — Reports page redirects managers/employees away from report tabs they appear entitled to**
*Location:* `app/(dashboard)/reports/page.tsx:31-36` hard-redirects non-QA/admin; but `components/reports/reports-client.tsx:76,80,83-90` marks Worker-Acknowledgements `access:"all"` and Training-Log `access:"manager"`.
*What's wrong:* A plain manager is bounced before reaching a report the config grants them.
*Impact:* Dead config; managers can't pull a report the app says they can.
*Fix:* Gate the page on the report-access model, not a blanket QA/admin redirect.

**H14 — Live Audit Trail realtime bypasses department scoping and drops the actor join**
*Location:* `components/dashboard/dashboard-client.tsx:166-186` subscribes to ALL `audit_log` INSERTs unfiltered; initial load is dept-scoped (`page.tsx:374-396`).
*What's wrong:* Cross-department events leak into a scoped feed; live rows render as "System" with blank avatars (no `actor` join).
*Impact:* Managers see other departments' audit events they shouldn't; confusing unattributed entries.
*Fix:* Filter the realtime subscription by department and re-fetch the actor join.

**H15 — Public equipment QR page leaks assignee PII to anonymous scanners**
*Location:* `app/e/[id]/page.tsx:76-86` → `components/equipment/equipment-public-view.tsx:164-173`.
*What's wrong:* An unauthenticated scan shows technician full name + department + serial/model/SOP numbers.
*Impact:* Information disclosure on a pharma floor; printed tags are world-readable.
*Fix:* Restrict the public view to non-PII fields (asset id, status, calibration-due).

**H16 — Email-verification link dead-ends in the waiting room**
*Location:* `actions/auth.ts:140` hardcodes confirmation `next=/onboarding`, but new users are `signup_status='pending'`, so `proxy.ts:79` bounces `/onboarding → /waiting-room`.
*What's wrong:* The user gets no "email confirmed" signal; the waiting room still says "verify your email."
*Impact:* Confusing onboarding; users think verification failed.
*Fix:* Send the confirmation link to `/waiting-room`.

**H17 — Notice-email recipients truncated to ~50 users**
*Location:* `actions/pulse.ts:103` calls `auth.admin.listUsers()` with no `perPage`/paging (the settings page correctly uses `perPage: 1000`).
*What's wrong:* On orgs >50 users, broadcast notice emails silently reach only the first page.
*Impact:* Org-wide announcements quietly miss most staff.
*Fix:* Page through all users (or reuse the settings approach).

---

### MEDIUM

**M1 — Onboarding lets any approved user self-assign QA-manager (approval authority).** `components/onboarding/dept-role-step.tsx` + `saveStepOne` accept `department='QA', role='manager'`, which `getCapabilities`/`isQaManager` treat as the sole org-wide sign-off role. Admin approval grants access, not privilege level. *Fix:* default new users to `employee`; grant manager/QA only via admin. (SoD-adjacent — borderline High.)

**M2 — Equipment photo URLs break ~1 hour after upload.** `components/equipment/add-equipment-modal.tsx:106` persists the 1-hour **signed URL** into `equipment.photo_url` instead of the storage `filePath` (contradicting `equipment-photo/route.ts:65-78`). *Fix:* store the path, sign on read.

**M3 — Non-Level-II SOP numbers are free-typed with no uniqueness/format guard.** `actions/sop.ts:108-135`; trigger `enforce_level_ii_sop_number` (`048:332-352`) validates only level_2; no unique constraint on `sops.sop_number`. *Fix:* add a unique constraint + format check for all levels.

**M4 — "Version History" / "View Archive" and "Copy SOP Number" are dead.** `sop-library-table.tsx:201,212`; `version-history-button.tsx:24-29` never passes `onViewVersion`, so `version-history-sheet.tsx:92` "View Archive" no-ops despite `sop_versions.file_url` existing. *Fix:* wire the handlers.

**M5 — Group chat "Add User" and "Settings" buttons are dead.** `components/messages/conversation-thread.tsx:664-665` — no `onClick`; rosters can't change after creation. *Fix:* implement or hide.

**M6 — Equipment "Log PM Completion" and "View Service History" dropdown items are dead.** `components/equipment/equipment-table.tsx:177-184`. *Fix:* wire to the PM-completion action / history view.

**M7 — Failed training attempt resets assignment to `not_started`.** `actions/training.ts:513-516` — a repeatedly-failing trainee is indistinguishable from a no-show in metrics and the CC completion gate. *Fix:* set `failed`/`in_progress`.

**M8 — CC completion gate & manager stats count completed/total with no active-user filter.** `actions/change-control.ts:454-463`, `actions/sop.ts:712-720`, `module-detail-client.tsx:52-55`. Soft-deleted (offboarded) users keep the rate below threshold permanently → gate can become unsatisfiable. *Fix:* exclude `is_active=false` assignees.

**M9 — `screenChangeControlRequest` doesn't check current status.** `actions/change-control.ts:238` will re-screen a closed/rejected/in-signing CC, rewinding it and wiping reasons. *Fix:* guard on `status='submitted'`.

**M10 — "Cryptographically Signed" badge is a reused static PNG; `ip_address` stores the JWT.** `actions/sop.ts:971-981` writes the access token into the audit `ip_address` field; signature image is a shared asset, not a per-signer credential. *Fix:* capture real IP; don't misuse the field; don't imply crypto signing.

**M11 — RFS lifecycle gaps: no reject after `approved`, `approved` can skip `received`, requester has no cancel/withdraw/edit.** `supabase/migrations/039_request_forms.sql:256,302`; `actions/request-forms.ts`. *Fix:* add cancel/withdraw + tighten transitions.

**M12 — QA sees QA action buttons on their own RFS submissions; RPCs don't block self-action.** `SubmissionDetailSheet isQa` on personal `/requests`; RFS RPCs lack a self-action guard — SoD gap vs the SOP rule. *(needs verification of exploitability)* *Fix:* block self-action server-side.

**M13 — `completePmTask` lets any manager close any department's PM task.** `actions/equipment.ts:325`; RPC has no dept guard. *Fix:* restrict to owning dept/admin.

**M14 — Rejected signups show "deactivated"; `rejected` is a dead state.** `actions/settings.ts:580` only sets `is_active=false`; nothing reads `signup_status='rejected'`. *Fix:* add a rejected branch + copy + re-approve path.

**M15 — "Pulse Panel Alerts" toggle is dead.** `components/settings/notifications-tab.tsx:88-94` persists `notification_prefs.pulse`; no consumer reads it. *Fix:* honor it or remove it.

**M16 — `sequence_padding` input sliced to 1 digit but server requires 2–8.** `components/settings/departments-tab.tsx:161` (`.slice(0,1)`) vs `actions/settings.ts:39-41`. *Fix:* allow 2 digits; inline-validate.

**M17 — Dashboard "Send Notice" / "Add Equipment"-type CTAs misfire.** `dashboard-client.tsx:426-440` toggles the panel and dispatches on `document` while the listener is on `window`; doesn't open the composer. *Fix:* dispatch on the right target / open the composer.

**M18 — Setup guard predicate mismatch.** `app/(auth)/setup/page.tsx:13` locks on `count(profiles)>0` while `proxy.ts:51` & `createFirstAdmin` use `has_any_admin()`. Diverge in an all-admins-deactivated recovery. *Fix:* use `has_any_admin()` in the page.

**M19 — Test scaffolding in production offboarding.** `deactivateUser` (`actions/settings.ts:470`) special-cases `full_name === 'Test Pending User'` to reset-to-pending. *Fix:* remove.

**M20 — Department rows use client-side `crypto.randomUUID()` ids.** `departments-tab.tsx` — same-session edit/delete can target the wrong row. *Fix:* use the persisted id.

**M21 — `signature_certificates` SELECT RLS blind to `sop_id IS NULL` (CC-only) certs; mobile signing has no realtime-miss polling fallback.** See `domain-approvals-cc.md` M2/M3. *Fix:* widen the policy; add a polling fallback.

**M22 — Admins can drive CCs but cannot approve SOPs/equipment (QA-manager-only RPCs).** Inconsistent authority — admins push doc changes live via the CC path but not the SOP path. *(needs verification of intent.)*

---

### LOW

- **L1 — `incrementVersion()` is unused and wrong.** `lib/utils/version.ts:1-10` mis-normalizes legacy `v1.0`; real logic is SQL `increment_sop_version` (`046:41-59`). CLAUDE.md falsely claims the TS helper is used. *Fix:* delete it; correct the doc.
- **L2 — Notice composer shows "/500" with no `maxLength`/server validation.** `notice-composer.tsx:126`, `actions/pulse.ts:9-46`.
- **L3 — `pulse_items.type` CHECK (migration 006) omits several emitted types.** *(needs verification a later migration widened it.)*
- **L4 — No last-admin protection** in `revokeAdmin`/`deactivateUser` (`actions/settings.ts`); `waive_cc_signature` trusts `p_admin_id` without an internal `is_admin` check.
- **L5 — Notification emails interpolate raw `sop_id` UUIDs** instead of SOP number/title. `actions/sop.ts:527,569,909,1032-1034`.
- **L6 — PII in `console.log`** (`proxy.ts`, `auth/callback`); stray `import { report } from "process"` in `reports-client.tsx:12`; redundant double `getUser()`; placeholder.com email logo + "SOP-Guard Pro" vs "QMS-MANAJA" brand mismatch.
- **L7 — Google OAuth may insert a blank `full_name`; no resend-verification path** (`onboarding-by-role.md` M1/M2).

---

## Onboarding by Role

The core happy path is sound: there **is** a working admin approval UI (Settings → Users, `approveUser`/`rejectUser`, admin-gated), onboarding persists each step, the `proxy.ts` state machine is internally consistent, and first-admin bootstrap guarantees ≥1 active admin who is Pulse-notified of new signups. No "stuck forever / no approver" defect, no global redirect loop, no blank dashboard.

| Role | How invited / created | Lands on | First screen works? | Blocking issue |
|---|---|---|---|---|
| **First Admin** | `/setup` bootstrap when no active admin exists (`createFirstAdmin`) | `/dashboard` | ✅ | Setup guard predicate mismatch (M18) only in all-admins-deactivated recovery |
| **Admin** | Promoted by existing admin in Settings → Users | `/dashboard` | ✅ shell works | **Locked out of Training management** (H1) — dead `role==='admin'` |
| **QA Manager** | Self-selected QA+manager in onboarding, after admin approval | `/dashboard` | ✅ | Privilege self-escalation path (M1): nothing stops a user picking QA-manager |
| **QA Employee** | Self-selected QA + employee | `/dashboard` | ✅ | None blocking; read-elevation only |
| **Manager (regular dept)** | Self-selected manager | `/dashboard` | ✅ | Reports tabs they appear entitled to redirect away (H13) |
| **Employee (regular dept)** | Default signup → admin approval → onboarding | `/dashboard` | ✅ | Can originate CCs for any dept (H2) |
| **Engineering Manager** | Self-selected Eng + manager | `/dashboard` | ✅ | None blocking |
| **Engineering Employee** | Self-selected Eng + employee | `/dashboard` | ✅ shell | Sees Equipment "Add/Manage" UI that backend rejects (H7) |
| **Any new signup (email verify)** | Email confirmation link | bounced to `/waiting-room` | ⚠️ | Verify link points at `/onboarding` then bounces; no "confirmed" signal (H16) |
| **Rejected applicant** | Admin "Reject" | `/login` | ⚠️ | Shown "deactivated," not "rejected"; no re-approve path (M14) |

Cross-cutting onboarding issue: **identity vs privilege.** Admin approval is treated as "you may enter," but the user themselves chooses department + manager/QA in onboarding — so the most powerful regulated role (QA manager) is self-assignable (M1).

---

## Role Access Appropriateness

Security posture is **solid at the data layer**: high-value RPCs (`approve_sop_request`, `approve_equipment`, `confirm_cc_reconciliation`, `destroy_sop_record`, `mark_rfs_*`, CC document RPCs) re-assert `is_qa_manager`/`is_admin` inside `SECURITY DEFINER` bodies, and RLS is enabled everywhere. **No Critical privilege-escalation path via direct table access.** The problems are (a) a couple of service-client actions that skip the re-check, and (b) UI/backend capability mismatches causing silent failure or under-privilege.

| Role | Core capabilities | Over-privileged? | Under-privileged? | Verdict |
|---|---|---|---|---|
| **Admin** | Manage users/departments, drive CCs, view reports | Mild: can drive CCs live but not approve SOPs/equipment (M22) | **Yes — locked out of Training (H1)** | **Needs fix** |
| **QA Manager** | Sole SOP/equipment approval authority, CC reconciliation, org oversight | No (self-approval blocked) | No | **Appropriate** (strongest sound role) |
| **QA Employee** | Elevated read (supervisory cards); cannot approve | No (verified `is_qa_manager` needs `role='manager'`) | No | **Appropriate** |
| **Manager (regular)** | Dept oversight, HOD review, equipment, training authoring | Minor: close other depts' PM tasks (M13); originate CC for any dept (H2) | No | **Mostly appropriate** |
| **Employee (regular)** | Read library, take training, submit requests | **Yes — can originate CC packages for any dept (H2)** | No | **Needs fix** |
| **Engineering Manager** | Equipment add/manage + standard manager | No | No | **Appropriate** |
| **Engineering Employee** | Standard employee + (claimed) equipment management | UI implies it | **Yes — UI shows equipment mgmt backend rejects (H7)** | **Contradictory — fix UI/backend** |

All-or-nothing observations: equipment is "manager-can-do-everything / others-nothing" with no edit-vs-create grain (H8); training authoring is creator-or-QA with admins excluded by bug (H1).

---

## What's Actually Solid

- **SOP approval RPC** enforces QA-only sign-off, blocks self-approval, and uses named args correctly (no positional mismatch). Cross-dept read-only enforcement for active SOPs works.
- **Signature completion** is trigger-driven (AFTER INSERT on `signature_certificates` → `check_cc_completion`); CC lock/unlock, signatory snapshotting, and append-only audit tables all hold.
- **Dashboard KPIs are real** scoped server-side aggregates — no hardcoded/fake numbers found. Reports query real data with working CSV export.
- **Risk assessment** is genuinely computed (deterministic SQL in migration 041; AI only narrates). PM next-task chaining/drift-prevention (migration 034) is correct.
- **Training core loop** (take → grade → pass → certificate) is real: real scoring, real jsPDF certificate, real PPTX/PDF exports, real Gemini generation.
- **Messaging & Pulse** persist correctly; pulse visibility is enforced by a correct RLS SELECT policy (single NULL-recipient broadcast row, client-side audience filter as designed).
- **Settings/Admin**: deactivation truly revokes access; admin actions are server-enforced; audit log is append-only and actually written; PWA push and offline are real, not stubs.
- **RFS happy path** (submit → received → approved → fulfilled/rejected) and AI builder chat → versioned drafts → Word generate/download with per-action metering all work.

---

## Suggested Fix Priority Order

**P0 — Before any pilot (config + security, hours of work):**
1. C1 — Point email at a real SMTP provider; fail loudly on send error.
2. C2 — Populate `vercel.json` crons (PM, overdue, training-deadline, risk-refresh).
3. C3 — Authorize `signChangeControl` (signer ∈ snapshot, status check).
4. C4 — Enforce cron secret in all environments.

**P1 — Unblock the flagship workflows (days):**
5. C5 — Create the `sops` row for new-document CC reconciliation.
6. C6 — Allow training authoring against `approved_pending_training` SOPs (breaks the deadlock).
7. H1 — Fix `role==='admin'` → `is_admin` everywhere (restores admin training access).
8. H5 — Wire "Submit Edit" to the revision/CC flow.

**P2 — SoD, privilege, and reconciliation (days):**
9. H2/H3/M1/M12 — Close CC self-origination/self-approval and onboarding self-escalation; force dept provenance.
10. H7 — Align Equipment UI with backend (`canManageEquipment`).
11. H6/H10 — Reconcile library counts and retire the legacy request system from badges.
12. H9 — Add a "Mark Reviewed" path to clear `needs_review`.

**P3 — Lifecycle completeness & honesty (1–2 weeks):**
13. H8 — Equipment edit/decommission.
14. H11/H12 — Either integrate AI Builder → Library or stop advertising quota/authoring it can't do.
15. H13/H14/H15/H16/H17 — Reports access, audit-trail scoping, QR PII, verify-link landing, notice paging.
16. Medium tier — dead buttons (M4–M6), photo URLs (M2), RFS cancel (M11), failed-attempt state (M7), active-user filters (M8), status guards (M9).

**P4 — Cleanup:** Low tier (dead code, validation, branding, logging hygiene).

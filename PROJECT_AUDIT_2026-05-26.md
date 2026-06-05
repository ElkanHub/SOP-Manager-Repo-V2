# SOP-Guard Pro Project Audit Report

**Audit date:** 2026-05-26  
**Audit type:** Static application, security, data-integrity, and delivery-readiness review  
**Auditor perspective:** Independent project/code auditor  
**Application stack observed:** Next.js 16, React 19, Supabase Auth/Postgres/Storage/Realtime, Serwist PWA, Gemini integration....

## Executive Summary

The application has a substantial functional implementation for document control, change control, PM/equipment tracking, training, requests, messaging, reporting, and offline access. The project has adopted private document storage, RLS on many tables, audit logging, and role-oriented server actions.

The current implementation is **not suitable for production handling of controlled documents or digital signatures until critical authorization weaknesses are remediated**. Two critical findings allow signature disclosure/manipulation and direct invocation of privileged database workflows. Multiple server paths also bypass row-level security with service-role access without re-establishing record-level authorization.

| Severity | Count |
| --- | ---: |
| Critical | 2 |
| High | 5 |
| Medium | 2 |

## Scope And Method

Reviewed areas:

- Application routes, API handlers, server actions, proxy/session handling, PWA/offline code, storage access, and AI document processing.
- Supabase migrations through `044_sop_annotation_location.sql`, focusing on RLS and `SECURITY DEFINER` functions.
- Build/tooling metadata and available validation commands.

Limitations:

- This was a source-level audit, not an authenticated penetration test against a deployed Supabase instance.
- Database findings describe the effective posture of the tracked migrations. Any out-of-band production grants or policies were not available for verification.
- `npm run lint` exceeded 120 seconds and `npm run build` exceeded 180 seconds without producing a completion result during audit execution.

## Priority Findings

### F-01 - Anonymous users can enumerate and overwrite mobile signature records

**Severity:** Critical  
**Domain:** Digital signatures / privacy / record integrity

**Evidence**

- `supabase/migrations/036_mobile_signatures.sql:10-16` stores `user_id` and `signature_base64` in `mobile_signatures`.
- `supabase/migrations/036_mobile_signatures.sql:38-42` grants `anon` and `authenticated` `SELECT` access with `USING (true)`.
- `supabase/migrations/036_mobile_signatures.sql:51-56` grants anonymous completion of any pending, unexpired record.
- `app/m/[token]/mobile-sign-client.tsx:134-143` performs the anonymous update directly from the browser.

**Finding**

The policy comment claims access is safe because a caller must know a UUID, but `USING (true)` does not enforce a token lookup. Through Supabase REST, an anonymous caller can issue an unrestricted select over the table and retrieve tokens, user identifiers, status, expiry, and completed base64 signature images. Pending rows obtained this way can also be completed with attacker-supplied signature data.

**Impact**

- Disclosure of digital signatures and user-linked signature sessions.
- Forged or disrupted signature capture.
- Loss of evidentiary reliability for controlled-document approvals.

**Required remediation**

- Remove anonymous table `SELECT` and `UPDATE` policies.
- Replace them with a narrowly scoped server endpoint or RPC using a separate high-entropy one-time secret stored hashed, returning only state needed by the mobile flow.
- Bind completion to the one-time secret, enforce single use and expiry atomically, and ensure the authenticated desktop owner alone retrieves the completed signature.
- Assess existing signature records for exposure and invalidate all pending sessions after deployment of the fix.

### F-02 - Privileged `SECURITY DEFINER` RPCs can be invoked with spoofed actor IDs

**Severity:** Critical  
**Domain:** Authorization / workflow integrity / audit integrity

**Evidence**

- `supabase/migrations/009_functions.sql:191-210` defines `waive_cc_signature` and states admin control is enforced only in a server action; the function itself does not verify the caller.
- `supabase/migrations/034_pm_scheduling_fix.sql:3-39` defines `complete_pm_task(p_task_id, p_user_id, ...)` as `SECURITY DEFINER` and records the supplied `p_user_id`.
- `supabase/migrations/034_pm_scheduling_fix.sql:72-97` defines `approve_equipment(p_equipment_id, p_qa_user_id)` and validates the supplied user ID, not `auth.uid()`.
- `supabase/migrations/026_change_control_classification.sql:12-18` similarly exposes `approve_sop_request(..., p_qa_user_id, ...)`.
- Across the migrations reviewed, execution is explicitly revoked only for `compute_risk_metrics` in `supabase/migrations/041_risk_assessment.sql:186-189`; equivalent revocations were not found for the workflow RPCs above.

**Finding**

These definer functions bypass RLS and trust identity parameters supplied by the caller. In the tracked schema, PostgreSQL function execution is not revoked from public/client roles for these functions. A client with reachable record IDs can call workflow RPCs directly and either supply their own identity for completion or supply the UUID of a real QA/admin user for approval/waiver actions.

**Impact**

- Unauthorized completion of PM tasks.
- Unauthorized signature waivers and potential activation of document changes.
- Unauthorized equipment/SOP approvals.
- Audit records attributing actions to users who did not perform them.

**Required remediation**

- Immediately revoke execute privileges on mutation `SECURITY DEFINER` functions from `PUBLIC`, `anon`, and `authenticated`; grant only to a controlled server/service role where appropriate.
- Alternatively or additionally, make each RPC authorize `auth.uid()` internally and derive the acting user from the session rather than accepting actor identity as input.
- Add `SET search_path = public` to every security-definer function.
- Review audit history for anomalous direct RPC activity after deployment.

### F-03 - Authenticated users can retrieve private document objects without record-level authorization

**Severity:** High  
**Domain:** Controlled document confidentiality

**Evidence**

- `app/api/docs/proxy/route.ts:15-30` verifies only that a session exists, then downloads the caller-supplied storage `path` through the service-role client.
- `app/api/change-control/diff/route.ts:8-29` verifies only authentication, then downloads arbitrary caller-supplied `old_file_url` and `new_file_url` through the service role.
- `app/api/gemini/delta-summary/route.ts:8-18, 26-50` checks that a user is active, then downloads arbitrary supplied document paths using the service role.
- `actions/sop.ts:873-891` generates a signed URL for a caller-supplied SOP ID after authentication but does not verify that the caller can access that SOP.

**Finding**

The private bucket is bypassed by service-role endpoints that do not prove the requester is entitled to the referenced SOP, approval request, or change-control document. Storage paths appearing in application responses, logs, shared links, or browser state can be replayed by an unrelated authenticated user.

**Impact**

- Unauthorized access to controlled SOP drafts, revised documents, and diff contents.
- Unauthorized submission of document content to the AI provider.

**Required remediation**

- Accept business-record identifiers, not raw storage paths, at the API boundary.
- Load the related record through an RLS-scoped user client or implement explicit authorization checks before any service-role storage download or signed URL creation.
- Reject access unless the user is authorized for that SOP/approval/change control.

### F-04 - Service-role page queries disclose restricted operational and audit records

**Severity:** High  
**Domain:** Authorization / confidentiality

**Evidence**

- `app/(dashboard)/equipment/[id]/page.tsx:13, 31-54` loads any equipment record, PM task history, and assignable user list through a service client after checking only active login status.
- `app/(dashboard)/change-control/[id]/page.tsx:13, 31-40` loads any change control and all signature certificates through a service client without confirming department, signatory, QA, or admin access.
- `app/(dashboard)/dashboard/page.tsx:17, 374-386` reads `audit_log` through the service client for ordinary departmental users, although database RLS restricts audit-log viewing to QA managers/admins.
- `app/(dashboard)/dashboard/page.tsx:50` determines QA oversight using the hard-coded department name `QA`, rather than the database `is_qa` authority model used elsewhere.

**Finding**

RLS protections are bypassed for display queries and replaced with incomplete or different page-layer rules. Any active authenticated user who obtains or guesses an object ID can retrieve records that the database policy would deny, and ordinary dashboard users receive audit-log entries that RLS is designed to restrict.

**Impact**

- Exposure of PM history, personnel assignment data, change-control signatures, and audit history.
- Divergent authorization behavior if QA department naming changes.

**Required remediation**

- Use the session/RLS client for reads wherever possible.
- If a service client is required, centralize server-side authorization and require it before each record query.
- Remove audit-log delivery to users not authorized by its intended policy.
- Use `is_qa_manager()` or department `is_qa`, not string comparison.

### F-05 - Any manager can complete PM tasks outside their authorized department

**Severity:** High  
**Domain:** Maintenance record integrity

**Evidence**

- `actions/equipment.ts:311-326` checks department membership but exempts every user whose role is `manager`.
- `actions/equipment.ts:329-334` then executes completion with the service-role-backed RPC.

**Finding**

The guard authorizes a manager from any department to complete any PM task, even where the manager is neither assignee nor responsible for the equipment department. This remains a defect independently of F-02, because it is reachable through normal application server actions.

**Impact**

- Falsified completion history and new scheduling cycles.
- Reduced reliability of PM compliance reporting.

**Required remediation**

- Require the caller to be the assignee, a manager of the equipment primary/secondary department, or an explicitly authorized QA/admin role.
- Enforce the same rule inside the database mutation boundary.

### F-06 - Offline and service-worker caching retain sensitive data after sign-out

**Severity:** High  
**Domain:** Endpoint privacy / offline storage

**Evidence**

- `hooks/use-offline-seed.ts:30-54` persists up to 500 SOPs, 500 equipment rows, departments, and all visible active profiles using broad `select("*")` calls.
- `lib/db/offline-db.ts:127-137` provides a purge function, but no use of `clearOfflineDB` was found.
- `actions/auth.ts:141-144` signs out without clearing client offline records or browser caches.
- `app/sw.ts:107-121` caches visited application pages for 24 hours and `app/sw.ts:143-156` caches Supabase storage responses, including signed document downloads, for seven days.

**Finding**

The PWA deliberately stores document/asset/profile information and cached document responses on the device, but logout does not clear that retained information. On a shared workstation or a reallocated mobile device, a later user can access previously cached controlled content without an authenticated session.

**Impact**

- Post-logout disclosure of controlled records and personal profile information.
- Signed document content persists beyond signed URL expiration because the response itself is cached.

**Required remediation**

- Define an offline data classification and explicitly exclude signatures, drafts, audit records, and sensitive profile fields from storage.
- Clear IndexedDB and relevant Cache Storage entries on logout, account deactivation, and identity switch.
- Do not cache private signed document responses, or encrypt offline content using an authenticated, user-bound design with a revocation strategy.

### F-07 - Public equipment QR route exposes personnel and equipment details

**Severity:** High  
**Domain:** Public data disclosure

**Evidence**

- `app/e/[id]/page.tsx:18-29` bypasses RLS through the service role and returns equipment serial/model/status details on a public route.
- `app/e/[id]/page.tsx:70-81` loads the next PM task and exposes the assigned profile's name, department, and avatar without authentication.

**Finding**

Anyone possessing a photographed, forwarded, or misplaced QR code can view assigned personnel details and operational equipment information. The UUID prevents enumeration but is not an authorization control once the QR is distributed.

**Impact**

- Public disclosure of staff associations and equipment metadata.
- Operational/security exposure depending on the equipment context.

**Required remediation**

- Reduce public output to non-sensitive identification and a login prompt.
- Require authenticated authorization for assignee names, schedules, serial/model values, and maintenance state unless documented business approval explicitly accepts public disclosure.

### F-08 - Automated release validation is incomplete and could not complete within audit time

**Severity:** Medium  
**Domain:** Delivery readiness / quality assurance

**Evidence**

- `package.json:5-10` defines `build` and `lint` scripts but no automated `test` script.
- Audit execution of `npm run lint` timed out after 120 seconds without a completion result.
- Audit execution of `npm run build` timed out after 180 seconds without a completion result.

**Finding**

No repeatable automated test suite is exposed in the package scripts for high-risk authorization and controlled-document workflows. In addition, the baseline lint/build checks could not be completed within practical CI-style bounds during review.

**Impact**

- Critical privilege and data-exposure regressions can reach deployment undetected.
- Release status cannot be established reliably from the current validation workflow.

**Required remediation**

- Add automated tests for RLS/RPC grants, record-level authorization, signature lifecycle, document downloads, PM completion, and logout/offline cleanup.
- Diagnose lint/build runtime and execute them under CI with clear time limits and captured output.

### F-09 - Cron alert jobs can repeatedly create duplicate notices

**Severity:** Medium  
**Domain:** Operational reliability / notification integrity

**Evidence**

- `app/api/cron/pm-alerts/route.ts:40-63` inserts PM due notices for all tasks in the seven-day window on every invocation without a deduplication check.
- `app/api/cron/overdue-check/route.ts:105-179` repeatedly emits change-control overdue and escalation notices while a control remains pending.
- In contrast, `app/api/cron/training-deadline-check/route.ts:52-63` explicitly deduplicates training alerts.

**Finding**

Scheduled invocations generate repeated notices for unchanged PM and change-control conditions. This undermines alert usefulness and inflates operational/audit data.

**Impact**

- User alert fatigue and missed material notifications.
- Unbounded duplicate pulse records over time.

**Required remediation**

- Introduce idempotency keys or query-before-insert logic based on task/control, notification class, and alert period.

## Positive Controls Observed

- Private document uploads generate signed URLs rather than public bucket URLs in `app/api/storage/sop-upload/route.ts`.
- The approval preview endpoint checks whether the requester is QA or the original submitter before returning document HTML.
- Risk metric computation explicitly restricts RPC execution to the service role.
- Audit-log table write policies are explicitly hardened against normal client writes.
- Training deadline notifications implement duplicate suppression.

## Remediation Roadmap

| Priority | Action | Target |
| --- | --- | --- |
| Immediate | Disable anonymous `mobile_signatures` select/update and rotate/invalidate pending signature sessions. | Before further user testing |
| Immediate | Revoke client execution of privileged mutation RPCs and bind acting identity to `auth.uid()` or service-only calls. | Before deployment |
| High | Refactor service-role document, equipment, change-control, and audit reads to enforce record-level authorization. | Before production data |
| High | Correct PM completion authorization and add database-enforced checks. | Before compliance reporting |
| High | Implement logout purge and restrict private PWA caching/offline persistence. | Before rollout on shared devices |
| Medium | Minimize public QR record exposure and document accepted public data. | Before QR distribution |
| Medium | Add workflow security tests, reliable CI validation, and cron idempotency. | Before release candidate |

## Overall Conclusion

The application has progressed beyond a prototype in feature scope, but its security boundaries are not yet aligned with the sensitivity of SOP control, maintenance compliance, personnel data, and signatures. The critical findings are architectural authorization failures rather than cosmetic defects. Production release should be blocked until F-01 and F-02 are corrected and verified, with F-03 through F-07 resolved before controlled or personal data is used in live operation.

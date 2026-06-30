# Domain Audit — Approvals & Change Control (QA approval workflow + signatures)

Date: 2026-06-24
Branch: perf/landing-page
Scope: SOP approval (HOD endorse → QA approve), Change Control lifecycle (request-origin + SOP-revision-origin), signatures, mobile signature capture.

## Verification of the four KEY DOMAIN RULES

1. **QA is sole approval authority; QA cannot self-approve.** ✅ HOLDS for the SOP-approval RPC.
   `approve_sop_request` (045_sop_process_consolidation.sql:221-227) rejects `req.submitted_by = p_qa_user_id` and rejects non-QA via `is_qa_manager`. HOD self-endorse is also blocked (actions/sop.ts:625). **BUT** the *Change Control* path has NO self-approval guard (see Finding H1) — QA screening, document approval, signing, reconciliation can all be performed by the same QA manager who originated the package.

2. **CC active ⇒ `sops.locked = true`; lock released on completion.** ✅ HOLDS for SOP-revision CCs. `create_change_control` sets `status='pending_cc', locked=true` (052:75). `confirm_cc_reconciliation` (053:189) and `activate_sop_effective` (045:135) set `locked=false`. ⚠️ The Submit-Edit "must check locked" half could not be confirmed in this domain's files — flagged for the SOP-upload domain. (needs verification)

3. **`required_signatories` snapshotted at CC creation; completion checks snapshot.** ✅ HOLDS. Snapshot at creation (`create_change_control` 052:36, `cc_snapshot_signatories` 053:16). `check_cc_completion` iterates `cc.required_signatories` jsonb, not a live query (052:93).

4. **Signature audit-trail tables have NO update/delete policies.** ✅ HOLDS. `signature_certificates` has only INSERT + SELECT policies (011_rls.sql:79-85). No UPDATE/DELETE. Append-only is preserved.

---

## CRITICAL

### C1 — Request-origin Change Controls silently complete without doing anything (brand-new documents are dropped)
- **Location:** `supabase/migrations/053_cc_package_lifecycle.sql:157-209` (`confirm_cc_reconciliation`); reconciliation UI `components/change-control/change-control-package-client.tsx:199-213`.
- **What's wrong:** Reconciliation loops child documents and `CONTINUE WHEN doc.document_id IS NULL OR doc.new_file_url IS NULL`. A department-raised CC (`submitChangeControlRequest`, actions/change-control.ts:145) creates `change_control_documents` rows with `document_id = null` for brand-new documents and never creates a new `sops` row anywhere in the pipeline. So at reconciliation every such document is skipped, `v_any_training` stays false, and the CC is marked `status='effective'` / `closed` having created/activated **nothing**. There is no code path that turns a request-origin "new document" into an actual SOP.
- **Real-world impact:** QA runs a full multi-step Change Control for a new controlled document, collects governance signatures, confirms reconciliation, sees "Reconciliation confirmed — SOPs activated", and the document never exists in the Library. A silent, audit-trail-backed lie. Existing-SOP revisions still work; new-document CCs are a dead end.
- **One-line fix:** In `confirm_cc_reconciliation`, for `document_id IS NULL` rows create the SOP (insert into `sops` from the child-document fields + `new_file_url`) before activating, or block reaching `signatures_pending` until every document is linked to an SOP.

### C2 — `signChangeControl` does not verify the signer is a required signatory or that the CC is open for signing
- **Location:** `actions/sop.ts:937-985`.
- **What's wrong:** The action runs on the **service client** (RLS bypassed) and only checks: user active, has `signature_url`, not already signed. It never checks the user is in `required_signatories`, nor that `change_controls.status = 'signatures_pending'`. A signature row inserted at any status fires the `signature_inserted` trigger → `check_cc_completion`, which only `RETURN`s early for `pending_reconciliation/pending_training/effective/closed` (052:91) — so a cert inserted while status is `documents_in_review` etc. counts toward completion and can flip the package to `pending_reconciliation` out of order.
- **Real-world impact:** Any active user who can reach the endpoint (it's a server action with no role gate) can insert a binding governance signature against any CC id for themselves, including for CCs they aren't a signatory of, and can force premature advancement. The UI hides the button (`canSign`), but the server action is the security boundary and it has none.
- **One-line fix:** In `signChangeControl`, load the CC, assert `status='signatures_pending'` and that `auth.uid()` appears in `required_signatories` (and not waived) before inserting.

---

## HIGH

### H1 — No self-origination guard anywhere in the Change Control workflow
- **Location:** `actions/change-control.ts:238` (`screenChangeControlRequest`), `:388` (`reviewChangeControlDocument`), `:325` (`updateChangeControlStatus`), `confirm_cc_reconciliation` (053:145).
- **What's wrong:** Every CC gate authorizes purely on "is QA or admin". A QA manager who raised the CC (`requester_id`/`issued_by`) can screen-approve it, draft+approve every document, sign it, waive others, and confirm reconciliation — single-person end-to-end execution. Contrast the SOP path, which explicitly forbids QA self-approval (045:221). The domain rule "QA cannot self-approve" is effectively bypassable by routing the change through Change Control instead of the SOP approval queue.
- **Real-world impact:** Segregation-of-duties violation; a single QA actor can push a controlled change through the entire pharma change-control with zero independent review. Audit/inspection finding.
- **One-line fix:** Reject screening/reconciliation when `actor = requester_id` (and ideally require a second QA signature distinct from the screener).

### H2 — QA can approve a Change Control document for signing without attaching the revised file
- **Location:** `set_cc_document_review` (053:83-127) and UI `change-control-package-client.tsx:297`.
- **What's wrong:** The "Approve" button calls `reviewChangeControlDocument(doc.id,'approved')`. `set_cc_document_review` sets `review_status='approved'` with no check that `new_revision`/`new_file_url` were ever set. When every doc is "approved" the package auto-advances to `signatures_pending` (053:116). Later reconciliation skips docs with `new_file_url IS NULL` (053:162), so signatures are collected for a revision that has no document.
- **Real-world impact:** Governance signatures captured against a non-existent draft; the SOP is never updated even though the CC reports success. Combined with C1, an easy way to produce a fully-signed, "effective" CC that changed nothing.
- **One-line fix:** In `set_cc_document_review`, raise when `p_decision='approved'` and (`new_file_url IS NULL` or `new_revision IS NULL`) for an SOP-linked document.

### H3 — Status-tighten constraint forbids the very status the request flow writes (`qa_screening` reachable only by dead code; `submitted` ok, but screening can run on terminal states)
- **Location:** `actions/change-control.ts:238-323` (`screenChangeControlRequest`).
- **What's wrong:** `screenChangeControlRequest` fetches the CC but never checks its current `status`. It will happily re-screen a CC that is already `approved_for_document_work`, `signatures_pending`, `rejected`, or `closed`, resetting it back to `approved_for_document_work`/`rejected`/`clarification_requested` and wiping `rejection_reason`/`clarification_request`. The screening UI only shows for `submitted`/`qa_screening` (package-client.tsx:74), but the server action has no guard, so a stale tab or direct call can resurrect/rewind a closed package.
- **Real-world impact:** A closed or in-signing Change Control can be silently kicked back to document work, invalidating collected signatures' workflow context. Data-integrity / workflow-corruption bug.
- **One-line fix:** Guard `screenChangeControlRequest` to only proceed when `current.status IN ('submitted','qa_screening')`.

---

## MEDIUM

### M1 — "Cryptographically Signed / End-to-end secured" is a static reused PNG, not a per-signing artifact
- **Location:** `actions/sop.ts:974-981` (inserts `profile.signature_url` verbatim), `components/change-control/signature-confirm-modal.tsx:143` ("Confirm & Cryptographically Sign"), `app/m/[token]/mobile-sign-client.tsx:215` ("End-to-end secured").
- **What's wrong:** Signing a CC just copies the user's stored signature image URL into a cert row. There is no cryptographic signing, no per-document hash, no challenge. The mobile QR flow only populates `profiles.signature_url` once (settings/onboarding via `MobileSignQR.onCaptured` → `redrawSignature`), it is not a live per-CC signature. The `ip_address` field is filled with the signer's **access token** (`actions/sop.ts:971-972`), not an IP — leaking/garbage data.
- **Real-world impact:** 21 CFR Part 11-style "electronic signature" claims in the UI overstate the control; auditors may reject. Storing the access token in `ip_address` is both wrong and a minor secret-at-rest leak into an audit table.
- **One-line fix:** Drop the "cryptographic" wording or implement a real signed hash; replace the `ip_address` value with the actual `x-forwarded-for` header (NextRequest), not the JWT.

### M2 — `signature_certificates` SELECT RLS is blind to request-origin (multi-document) CCs
- **Location:** `supabase/migrations/011_rls.sql:81-85`.
- **What's wrong:** The "viewable by Manager" policy joins `change_controls cc JOIN sops s ON s.id = cc.sop_id`. Request-origin CCs have `sop_id = NULL` (relaxed in 047:40), so the join yields nothing and non-QA department managers can never read signature certificates for those CCs via RLS. (The package pages use the service client so the UI still renders, but any direct/RLS-scoped read by a signing manager fails.)
- **Real-world impact:** Inconsistent visibility; a department-manager signatory cannot verify peers' signatures through any user-scoped query. Low user-facing impact today because pages use service client, but it's latent and will bite the moment a client-side read is added.
- **One-line fix:** Add a SELECT policy allowing managers listed in `required_signatories` (jsonb contains `auth.uid()`) to read certs, independent of `sop_id`.

### M3 — Mobile signing session has no resend/recovery and writes are unthrottled
- **Location:** `app/m/[token]/mobile-sign-client.tsx:136-150`, `supabase/migrations/036_mobile_signatures.sql:51-56`.
- **What's wrong:** The mobile page updates `mobile_signatures` directly from the anon browser client. RLS allows *any* anon user holding the UUID to complete it (by design), but there's no rate-limit and the desktop has no "resend / new code" affordance once expired beyond regenerating from scratch. If realtime delivery drops (`MobileSignQR` only listens for the UPDATE event, mobile-sign-qr.tsx:80-92) the captured signature is lost with no polling fallback — the desktop sits on "Waiting for signature…" forever despite a completed row.
- **Real-world impact:** A user signs on mobile, sees success, but the desktop never receives it (missed realtime event) → must redraw. Frustrating, occasionally blocks onboarding completion.
- **One-line fix:** Add a polling fallback in `MobileSignQR` (re-`select` the row on an interval) in addition to the realtime subscription.

---

## LOW

### L1 — Approval-detail emails/subjects use raw SOP UUID instead of the SOP number/title
- **Location:** `actions/sop.ts:909` (`subject: \`Revision Requested: ${request.sop_id}\``), `:1032-1034` (`CC Signed: ${changeControl?.sop_id}`).
- **What's wrong:** Several notification subjects/bodies interpolate the raw `sop_id` UUID. For request-origin CCs `sop_id` is null, producing `CC Signed: System Update` / `undefined`.
- **Real-world impact:** Ugly, low-trust emails; recipients can't tell which document.
- **One-line fix:** Use the already-fetched `sopLabel` / CC title in subjects.

### L2 — `approve_sop_request` legacy effective-date handling unreachable but stale duplicate functions remain
- **Location:** `045_*` defines `confirm_cc_reconciliation`/`check_cc_completion`/`create_change_control`, all later replaced by 052/053. The 045 single-SOP `confirm_cc_reconciliation` references statuses (`pending_activation`) that the final constraint (055) forbids.
- **What's wrong:** Harmless because later migrations `CREATE OR REPLACE`, but the migration history contains several superseded versions; a partial replay or a future `CREATE OR REPLACE` ordering mistake could reintroduce the old logic.
- **Real-world impact:** Maintenance hazard only.
- **One-line fix:** None required; note for cleanup.

---

## Things that are actually fine (checked, not broken)
- QA-self-approval guard in `approve_sop_request` (045:221) and HOD self-endorse guard (sop.ts:625) both hold.
- Signature completion is driven by an AFTER INSERT trigger on `signature_certificates` (010_triggers.sql:27) → `check_cc_completion`; signing does advance the package (the action itself doesn't call it, but the trigger does). No "stuck after all sign" bug.
- `waive_cc_signature` re-checks completion (009:210) so an all-waived package still advances.
- Mobile signature RLS correctly prevents overwriting a completed/expired row (036:51-56).
- Reject / clarification / request-changes paths all exist and notify the requester.
- Signatory snapshot is stable across mid-CC transfers (snapshot, not live) — rule 3 holds.

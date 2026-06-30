# Document Control — End-to-End Walkthrough (as built on `feat/doc-control-v2.2`)

> Grounded in the **actual** code and the **actual** role model — not the spec's conceptual role table. Every gate below is enforced server-side (RPC or server action), file-referenced where it matters. Read this next to your spec and tell me where a seam remains.

---

## 0. The real role model (this is the correction that matters)

The system recognises exactly these identities on a `profiles` row — nothing was added:

| Real identity | How the code knows it | What they can do in document control |
|---|---|---|
| **Employee** (`role = 'employee'`) | `profiles.role` | Start a request, author/upload a new SOP (routes to HOD first), raise a change request, request a retirement, acknowledge effective SOPs, take training. **Cannot approve/endorse.** |
| **Manager** (`role = 'manager'`) | `profiles.role` | Everything an employee can, **plus**: endorse their own department's employee submissions (acts as **HOD**), and **sign** a change control when they're in its signatory snapshot. |
| **QA Manager** (`role='manager'` in a department with `departments.is_qa = true`) | `is_qa_manager()` RPC (`009_functions.sql`) | The **sole release authority**: screen/classify change controls, approve SOPs, reconcile, release training, review retirements, edit the classification matrix, run the effectiveness review and close. **Never approves their own submission.** |
| **Admin** (`is_admin = true`) | `profiles.is_admin` | User/role management; the only role that can **waive a signature** or **force-reconcile a copy** — and only through logged, reason-required exception paths. |

The spec's "Author / Signatory / Trainer / Viewer" are **behaviours**, not roles:
- **Author** = whoever uploaded a document (any employee or manager).
- **Signatory** = a manager who landed in a change's `required_signatories` snapshot.
- **Viewer** = any active user reading effective SOPs in the Library.
- **Trainer** = a manager/QA managing training modules.

There is **no branch scoping** — scoping is by `department` only (single-org). You confirmed single-branch, so nothing multi-branch was built.

---

## 1. The one front door — "Start a Request" (`/intake`)

Open to **any active, onboarded user** (`app/(dashboard)/intake/page.tsx` — no role gate). The user optionally picks one or more **effective** target documents, gives a reason, and optionally flips a "discontinue" toggle. The system **infers** the request type from the selection — the user never self-classifies:

| What they selected | Inferred type | Where it goes |
|---|---|---|
| No target | **New Document** | Upload modal (preset to new) → new-SOP approval |
| One effective target | **Change (single)** | Change Control pipe |
| Several targets | **Change (multi)** | Change Control pipe |
| Target + discontinue | **Retire** | Retirement pipe |

It shows the inference *with a plain rationale* ("SOP-042 is effective, so this is a change"), the user confirms, and there's a **dispute** affordance (adds a note for QA to re-evaluate). The type is locked only at dispatch.

> **Honest behaviour change to note:** the old SOP Library "Upload SOP" button was manager-only. Intake is open to all active users, so **employees can now start a new SOP** (it routes to HOD endorsement, exactly as the engine already supported). If you want authoring restricted to managers, that's a one-line gate — your call.

---

## 2. Journey A — New SOP (creation → effective)

**Who starts it:** any active user, via intake → "New Document" → upload `.docx` + details (number, title, level, department, reason, training flag).

**The path (server-enforced):**

1. **Submit** (`submitSopForApproval`, `actions/sop.ts`):
   - Author is an **employee** → SOP becomes `pending_hod`, request stage `hod_review`.
   - Author is a **manager** → skips HOD, SOP becomes `pending_qa`, stage `qa_review`.
2. **HOD endorsement** (employee path only — `endorseSopToQa`): a **manager of the same department** (who is **not** the submitter) endorses → `pending_qa`.
   - **Fallback (new):** if that department has no eligible manager (only the submitter, or none), a **QA manager** may endorse as a logged fallback so it never stalls (`sop_hod_endorsed_fallback` audit).
3. **QA approval** (`approve_sop_request` RPC): **QA only**, and **QA ≠ submitter** (raises if they're the same). QA sets training-required and an effective date.
4. **Effectiveness is decoupled from approval:**
   - No training, today's date → **`active`** immediately.
   - Training required → **`approved_pending_training`**; goes `active` only when the completion threshold is met and QA releases (`setSopEffectiveDate`).
   - **Future effective date → `scheduled`** (new). It is *not* live; a daily cron (`/api/cron/scheduled-activation`) flips it to `active` on the date.
5. First effective version is revision **00**, recorded as an `effective` row in `sop_versions` (the version model).

**What each role sees:** author tracks it under **My Requests**; HOD sees it in **Approvals**; QA approves in **Approvals**.

---

## 3. Journey B — Revision via Change Control (the dense one)

**Who starts it:** any active user, via intake → selects the effective SOP(s) → **Change**. This raises a Change Control package (`submitChangeControlRequest`). (SOP revisions issued directly from a QA-approved update also land in this same pipe via `create_change_control`.)

**The full lifecycle (each transition has a role guard):**

| # | State | Who acts / how | What happens |
|---|---|---|---|
| 1 | `submitted` | QA — *Begin screening* | → `impact_pending` |
| 2 | `impact_pending` → `classified` | QA — completes the **structured impact assessment** (affected docs, records, systems, training, revalidation) and assigns **minor / major / critical** (`classify_change_control`) | **Hard gate**: cannot advance until every impact field is present — no "submit anyway" |
| 3 | `classified` → `approved_for_document_work` **or** `queued` | QA — *Approve for work* (`approve_cc_for_work`) | **Concurrency guard**: if an affected SOP is locked under another open change, it enters **`queued`** and waits; otherwise the SOPs lock and work opens |
| 4 | `documents_in_review` | QA reviews each affected document (`set_cc_document_review`) | When **all** docs approved → auto-advance |
| 5 | `signatures_pending` | **Signatories sign** | Required set is **snapshotted from the classification matrix** (`cc_snapshot_signatories`): QA + owning-department managers (per the matrix flags). Snapshot is frozen at this point, so transfers mid-change don't move the goalposts. |
| — | (signature waiver) | **Admin only**, reason required, logged | The only way a required signature is bypassed |
| 6 | `pending_reconciliation` | QA confirms (`confirm_cc_reconciliation`) | **Copy-reconciliation gate**: every *issued controlled copy* of the outgoing revision must be reconciled (returned/destroyed/force-overridden) first. If you're paperless the register is empty and this is a no-op. |
| 7 | `pending_training` (if any doc needs training) | QA releases each doc once its threshold is met | Per-document training release |
| 8 | `effective` | atomic | New revision becomes effective **and the prior revision becomes `superseded` in one transaction** (the keystone) — never two "current" versions |
| 9 | `effectiveness_review` | QA — *Open effectiveness review* | The change is **not closed** at go-live |
| 10 | `closed` | **Independent approver** — confirms objective met (`close_change_control`) | Enforced **reviewer ≠ requester** |
| — | `rejected` | QA, reason required | Terminal |

**What each role sees:** requester tracks under **My Requests → Change Controls**; QA drives it from **QA Hub → Change Control**; signatories sign on the package screen.

> The new file for a revision is uploaded **during step 4 (document work)** in the CC workstation — *not* at intake. Intake only raises the request; impact/classification happen before any document is produced (correct GxP order).

---

## 4. Journey C — Retirement (discontinuation → destruction)

**Who starts it:** any active user, via intake → target + discontinue → **Retire** (`request_sop_retirement`, justification required). The document must currently be `active`.

| State | Who acts | Guard |
|---|---|---|
| `retirement_requested` | (created) | Justification ≥ 10 chars |
| → `pending_destruction` | **QA approves** (`approve_sop_retirement`) | **Pre-checks must pass** (no open change control, no open training; document-reference check is present but flagged *not yet enforced* — no reference graph exists). **QA ≠ requester.** Document → `retired`, its version → `retained`, retention clock starts. |
| → `destroyed` | **QA authorises** (`destroy_retired_document`) | **Time-gate**: destruction is impossible until `retention_until` has elapsed. The UI button is locked with a "retained until <date>" message until then. Content reference cleared; **metadata + audit retained** (you can still prove it existed and was destroyed properly). |
| `rejected` | QA, reason required | — |

**What each role sees:** QA reviews under **QA Hub → Retirements**; the requester and others can view status under **My Requests → Retirements** (read-only unless QA).

---

## 5. Cross-cutting behaviours

- **Acknowledgement** (`acknowledgeSop`): an active user in the SOP's department acknowledges the effective version. **New:** if the SOP requires training and the user hasn't completed it, acknowledgement is **blocked** (`is_user_trained_on_sop`) — not just flagged. This enforces the "stragglers can't execute" rule.
- **Periodic review** (`record_periodic_review`): QA *or* the owning-department manager records a review outcome (no change / revision needed / retire). "No change" pushes the next-due date out by the SOP's configurable interval. *(Engine + action built; the on-screen button still needs an entry point — see §7.)*
- **Controlled copies** (`controlled_copies`): QA issues/reconciles physical copies; this backs the reconciliation gate in §3 step 6. *(Engine + actions built; a dedicated management screen is pending — see §7. If you're paperless, you never need it.)*
- **Audit trail**: every transition, signature, waiver, override, rejection, classification, reconciliation, retirement, and destruction writes an append-only `audit_log` entry (who/what/when, and old→new/reason where applicable). The log is DB-locked against update/delete.

---

## 6. What each role sees in the sidebar (Create / Track / Process)

- **Everyone:** Dashboard · SOP Library · **Start a Request** · My Training · Equipment · Messages · **My Requests** (Change Controls · Retirements · Forms) · Calendar
- **Managers, additionally:** AI SOP Builder · Training Hub
- **QA, additionally:** Approvals · **QA Hub** (Change Control · Retirements · Forms · Classification Matrix) · Reports

One create door (intake), one place to track your own submissions, one QA workstation to process them.

---

## 7. Honest status — what is and isn't finished

**Solid and verified (typecheck + production build green throughout):**
- The whole engine (migrations 057–062), the action layer, the intake, the CC workstation depth, retirement review, classification-matrix editor, the nav.

**Cannot be verified from here:** the migrations have **not** been applied to your live Supabase — they need `supabase db push`. They were statically + adversarially reviewed and 6 issues fixed, but a real apply is the final proof.

**Two deliberate UI partials (engine + actions exist, screen entry pending):**
1. **Periodic-review button** — RPC + action ready; needs a button on the SOP detail/dashboard.
2. **Controlled-copy management screen** — register + actions ready and the reconciliation gate enforces them; a screen to issue/list/reconcile copies is pending (and only needed if you issue physical copies — §14 #3 of the spec, a QA decision).

**One behaviour change to ratify:** intake lets **employees** start a new SOP (engine always allowed it; old UI didn't expose it). Tighten to managers-only if that's your policy.

**Nothing is merged to `main`.** Every step is a separate commit on `feat/doc-control-v2.2`, fully reviewable/revertible.

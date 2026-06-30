# Document Control Flow — as implemented in the app

> Traced from the real code (`actions/sop.ts`, `actions/change-control.ts`, and the Postgres RPCs/triggers in `supabase/migrations/`, final effective behavior). The diagrams are Mermaid — they render in GitHub, VS Code (with a Mermaid extension), or https://mermaid.live.

---

## 1. New SOP — creation → active

```mermaid
flowchart TD
    A([Author uploads .docx - reason for change required]) --> B{Submitter role}
    B -->|Employee| C[pending_hod - request stage hod_review]
    B -->|Manager| E[pending_qa - request stage qa_review]
    C -->|HOD endorses, not the submitter| E
    C -. HOD requests changes .-> RC[changes_requested - author revises and resubmits]
    E -. QA or HOD requests changes .-> RC
    RC -. resubmit .-> E
    E -. QA or admin rejects .-> RJ[[back to draft - request rejected]]
    E -->|QA approves - QA only, never self-approve| F{Training required}
    F -->|No| G[[active - revision 00]]
    F -->|Yes| H[approved_pending_training]
    H -->|Training meets threshold, QA sets effective date| G
```

---

## 2. Revision → Change Control (two entry points, one shared tail)

```mermaid
flowchart TD
    subgraph ENTRY [How a Change Control begins]
      direction TD
      U1([Update to an existing SOP - type update]) --> AP[HOD then QA approval - same path as a new SOP]
      AP -->|QA approves the update| CC0[create_change_control - SOP becomes pending_cc and LOCKED - new revision = NN plus 1]
      CC0 --> SP

      U2([Multi-document CC request - any active user]) --> SUB[submitted]
      SUB -->|QA screens: approve| AFD[approved_for_document_work]
      SUB -. QA: needs clarification .-> CLR[clarification_requested]
      CLR -. requester edits, QA re-screens .-> SUB
      SUB -. QA: reject .-> XR[[rejected - terminal]]
      AFD -->|QA opens document work| DIR[documents_in_review]
      DIR -->|QA approves every affected document| SP
    end

    SP[signatures_pending] -->|all required managers + QA sign - admin may waive| PR[pending_reconciliation]
    PR -->|QA confirms old printed copies reconciled| TQ{Any document needs training}
    TQ -->|No| EFF[[effective - SOP active, unlocked, new revision]]
    TQ -->|Yes| PT[pending_training - SOP back to approved_pending_training]
    PT -->|QA releases each doc after training meets threshold| EFF
    EFF -->|QA closes the package| CLS[[closed]]
```

---

## Who can do what (the gates)

- **QA is the sole approval authority** and **cannot self-approve** (submitter ≠ approver).
- **HOD endorsement is mandatory** for employee submissions before QA sees it.
- A revision **always** routes through Change Control — there is no "minor edit skips CC" shortcut.
- While a CC is open, the SOP is **locked** (`pending_cc`) — no new updates accepted until it goes effective.
- **Revisions are two-digit GMP numbers** (`00 → 01 → 02 …`), not `v1.0` / major.minor.

---

## ⚠️ Two gaps to check against your findings

1. **`superseded → pending_destruction → destroyed` is unreachable.** A revision updates the same SOP row in place; nothing in the code ever sets `superseded`, so the document destruction / retirement lifecycle is orphaned. Version history is kept in `sop_versions`, but the SOP record itself never enters a retired/superseded state.
2. **Two CC statuses are defined but never produced:** `draft` and `qa_screening`. Requests are inserted straight at `submitted`, so those are dead states in the enum.

---

## Full state reference

### `sops.status`
`draft → draft_in_review → pending_hod → pending_qa → approved_pending_training → pending_cc → active → superseded → pending_destruction → destroyed`
(last three currently unreachable — see gap 1)

### `sop_approval_requests`
- `status`: pending · changes_requested · approved · rejected
- `approval_stage`: hod_review · qa_review

### `change_controls.status` (CC package)
`draft* → submitted → qa_screening* → clarification_requested → approved_for_document_work → documents_in_review → signatures_pending → pending_reconciliation → pending_training → effective → closed` (+ `rejected`)
(`*` = defined but never produced — see gap 2)

### Transition index (FROM → TO: trigger by actor)

**SOP document**
- ∅ → pending_hod: submitSopForApproval — employee
- ∅ → pending_qa: submitSopForApproval — manager
- pending_hod → pending_qa: endorseSopToQa — dept HOD (≠ submitter)
- pending_qa → active: approve_sop_request (new, no training) — QA
- pending_qa → approved_pending_training: approve_sop_request (new, training) — QA
- approved_pending_training → active: setSopEffectiveDate / activate_sop_effective — QA
- pending_hod | pending_qa → draft: rejectSopRequest (type=new) — QA/admin
- active → pending_cc (+locked): create_change_control (on QA approval of an update) — QA
- pending_cc → active | approved_pending_training (+unlock): confirm_cc_reconciliation — QA/admin

**Approval request**
- pending (hod_review) → pending (qa_review): endorseSopToQa — HOD
- pending → approved: approve_sop_request — QA
- pending → changes_requested: requestChangesSop — QA or HOD
- pending → rejected: rejectSopRequest — QA/admin

**CC package**
- submitted → approved_for_document_work | clarification_requested | rejected: screenChangeControlRequest — QA
- approved_for_document_work → documents_in_review: updateChangeControlStatus — QA
- approved_for_document_work | documents_in_review → signatures_pending: set_cc_document_review auto (all docs approved) — QA
- [origin sop_revision] ∅ → signatures_pending directly: create_change_control — QA approval
- signatures_pending → pending_reconciliation: signature_inserted trigger → check_cc_completion (all signed/waived) — signatories / admin
- pending_reconciliation → effective (no training) | pending_training (any training): confirm_cc_reconciliation — QA/admin
- pending_training → effective: releaseChangeControlDocumentTraining → cc_recheck_effective — QA/admin
- any → closed: updateChangeControlStatus — QA/admin

---

*Key files: `actions/sop.ts`, `actions/change-control.ts`, `supabase/migrations/046_*` (approve_sop_request), `052_*` (create_change_control, check_cc_completion), `053_*` (set_cc_document_review, confirm_cc_reconciliation, cc_snapshot_signatories), `054_*` (cc_recheck_effective), `055_*` (status CHECK), `010_triggers.sql` (signature trigger), `045_*` (activate_sop_effective).*

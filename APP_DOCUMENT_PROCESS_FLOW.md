# App Document Process Flow

Source basis: implemented app code only. I reviewed server actions, UI handlers, database migrations, RPC functions, and triggers under `actions/`, `app/`, `components/`, `types/`, and `supabase/migrations/`. I did not use product docs as source material.

## Process Inventory

The app currently implements these document-facing process families:

1. SOP document submission, HOD review, QA approval, change request, activation, and revision.
2. SOP change control signing and reconciliation for SOP revisions.
3. Multi-document Change Control package requests and QA register handling.
4. SOP training gate and Effective Date release.
5. SOP acknowledgement.
6. SOP record retention/destruction.
7. General document requests.
8. Custom request forms and request form submissions.
9. AI SOP Builder draft generation and Word export.
10. Mobile signature capture for user signatures.

Equipment PM, calendar, Pulse todos, messaging, onboarding, and user approval exist in the app, but they do not directly mutate SOP/document lifecycle status. Equipment can link to an active SOP for display and PM context, but PM completion does not change SOP document status.

## Appwide Document Statuses

### `sops.status`

Implemented/allowed values:

- `draft`
- `draft_in_review`
- `pending_hod`
- `pending_qa`
- `approved_pending_training`
- `pending_cc`
- `active`
- `superseded`
- `pending_destruction`
- `destroyed`

Observed transitions:

- New SOP submitted by employee: creates SOP at `pending_hod`.
- New SOP submitted by manager: creates SOP at `pending_qa`.
- HOD endorsement: SOP moves from `pending_hod` to `pending_qa`.
- QA approves new SOP without training: SOP becomes `active`.
- QA approves new SOP with training: SOP becomes `approved_pending_training`.
- QA approves update/revision: SOP is tied to a Change Control and becomes `pending_cc` through the Change Control creation function.
- Change Control reconciliation without training: SOP becomes `active`.
- Change Control reconciliation with training: SOP becomes `approved_pending_training`.
- QA releases training gate: SOP becomes `active`.
- QA/admin starts retention destruction review: only a `superseded` SOP can become `pending_destruction`.
- QA/admin destroys retained record: only a `pending_destruction` SOP can become `destroyed`.

Allowed but not fully traced to an active UI/action in this pass:

- `draft`
- `draft_in_review`
- `superseded`

These values are accepted by schema and status badge code. The implemented flows I found create pending/active/change-control states, but I did not find a current app action that directly sets an SOP to `draft`, `draft_in_review`, or `superseded`.

### `sop_approval_requests.status`

Implemented/allowed values:

- `pending`
- `changes_requested`
- `approved`
- `rejected`

Observed transitions:

- Submission/resubmission creates an approval request at `pending`.
- HOD or QA requests changes: approval request becomes `changes_requested`.
- QA approval: approval request becomes `approved`.
- `rejected` exists in schema and UI filters, but I did not find an active reviewer action that sets SOP approval requests to `rejected`.

### `sop_approval_requests.approval_stage`

Implemented values:

- `hod_review`
- `qa_review`

Observed transitions:

- Employee submission starts at `hod_review`.
- Manager submission starts at `qa_review`.
- HOD endorsement changes request stage to `qa_review` and changes the SOP status to `pending_qa`.

### `change_controls.status`

The app has both legacy SOP revision signing statuses and newer multi-document package statuses.

Legacy SOP revision signing values used by the active SOP revision flow:

- `pending`
- `pending_activation`
- `complete`
- `waived`

Observed legacy transitions:

- QA approval of an SOP update creates Change Control at `pending` and sets the SOP to `pending_cc`/locked.
- Each required signatory signs by creating a `signature_certificates` row.
- Signature waiver marks a signatory waived and re-checks completion.
- When all non-waived signatories have signed, a trigger/RPC changes Change Control to `pending_activation`.
- QA/admin confirms reconciliation: Change Control becomes `complete`.
- Reconciliation also updates SOP file/version and then either activates the SOP or holds it at `approved_pending_training`.

New multi-document package values used by the Change Control request hub:

- `draft`
- `submitted`
- `qa_screening`
- `clarification_requested`
- `approved_for_document_work`
- `documents_in_review`
- `signatures_pending`
- `pending_reconciliation`
- `pending_training`
- `effective`
- `closed`
- `rejected`

Observed package transitions:

- User submits a package: creates Change Control at `submitted`.
- QA approves screening: status becomes `approved_for_document_work`.
- QA requests clarification: status becomes `clarification_requested`.
- QA rejects: status becomes `rejected`.
- QA/admin can manually move package status to `documents_in_review`, `signatures_pending`, `pending_reconciliation`, `pending_training`, `effective`, or `closed`.

Important distinction: the multi-document package hub status changes do not currently update the linked SOP document statuses in the same way as the legacy SOP revision Change Control reconciliation flow. They are package/register lifecycle statuses.

### `change_control_documents.review_status`

Implemented values:

- `pending`
- `in_review`
- `approved`
- `changes_requested`
- `rejected`
- `effective`

Observed behavior:

- Document rows are created when a multi-document Change Control package is submitted.
- Initial document rows default to `pending`.
- Legacy migrated rows are set to `approved` when their parent Change Control is already `complete` or `pending_activation`.
- I did not find an app action in the current UI pass that changes individual `change_control_documents.review_status`; package-level status is updated instead.

### `change_control_documents.training_status`

Implemented values:

- `not_required`
- `pending`
- `in_progress`
- `complete`

Observed behavior:

- Rows default to `not_required`.
- No active app action was found that transitions this field directly.

## 1. SOP Submission And Approval

Implemented entry point:

- UI: SOP upload modal in the Library.
- Server action: `submitSopForApproval`.
- Storage route: `/api/storage/sop-upload`.

### Step 1: Upload `.docx`

User action:

- User selects or drops a `.docx` file.

Implementation:

- The UI accepts only `.docx`.
- File size is limited to 25 MB in the modal.
- File is uploaded through `/api/storage/sop-upload`.
- The returned storage path is later saved to the database as the SOP/approval request `file_url`.

Document status effect:

- No SOP status changes during file upload alone.

### Step 2: Choose New SOP Or Update Existing

User action:

- User selects `New SOP` or `Update Existing`.

Implementation:

- New SOP:
  - Level II documents auto-generate the next controlled SOP number using `preview_next_sop_number`/`generate_next_sop_number`.
  - User enters title, department, document level, secondary departments, and reason for change.
- Update existing:
  - User selects an existing SOP from the Library.
  - Locked SOPs cannot be submitted for update.

Document status effect:

- No status change until final submit.
- Locked existing SOPs are blocked with: a Change Control is currently in progress.

### Step 3: Submit

User action:

- Employee submits to HOD.
- Manager submits directly to QA.

Implementation:

- Requires active user.
- Only active employees/managers can submit.
- Reason for Change is required.
- New SOP insert:
  - `version = '00'`
  - `document_type = 'SOP'`
  - `file_url = uploaded file path`
  - `submitted_by = current user`
  - `reason_for_change = entered reason`
  - status is based on submitter role.
- Approval request insert:
  - `status = 'pending'`
  - `approval_stage = 'hod_review'` for employees
  - `approval_stage = 'qa_review'` for managers
  - stores submitted file, notes, reason, and cross-functional departments.
- Pulse/audit entries are created.

Document status effect:

- Employee/new SOP: `sops.status = pending_hod`.
- Manager/new SOP: `sops.status = pending_qa`.
- Existing SOP update: the action creates an approval request, but does not directly change the existing SOP status at this submission point.

## 2. HOD Review

Implemented entry point:

- UI: approval detail page.
- Server action: `endorseSopToQa`.

### Step 1: HOD Opens Pending Request

Eligibility:

- Active manager.
- Request must be at `approval_stage = hod_review`.
- HOD must belong to the SOP's department.
- HOD cannot act unless the approval request is still `pending`.

Document status effect:

- No change just by opening the request.

### Step 2A: HOD Endorses To QA

Implementation:

- Updates approval request:
  - `approval_stage = qa_review`
  - `endorsed_by = current user`
  - `endorsed_at = now`
  - status remains `pending`.
- Updates SOP:
  - `status = pending_qa`.
- Inserts an approval comment if note was provided.
- Creates Pulse and audit entries.

Document status effect:

- SOP moves from `pending_hod` to `pending_qa`.
- Approval request stays `pending`, but stage changes to `qa_review`.

### Step 2B: HOD Requests Changes

Implementation:

- Uses the same `requestChangesSop` action as QA.
- HOD is authorized only when request stage is `hod_review` and HOD department matches SOP department.
- Inserts summary comment and optional inline annotations.
- Updates approval request:
  - `status = changes_requested`.
- Sends Pulse/email to submitter.
- Writes audit action `sop_hod_changes_requested`.

Document status effect:

- Approval request becomes `changes_requested`.
- The `sops.status` row is not updated by this action, so the SOP may remain `pending_hod`/existing state while the request is returned for changes.

## 3. QA Approval Review

Implemented entry point:

- UI: approval detail page.
- Server action: `approveSopRequest`.
- Database RPC: `approve_sop_request`.

### Step 1: QA Opens Pending Request

Eligibility:

- Active QA manager.
- Request must be at `approval_stage = qa_review`.
- QA manager cannot approve their own submission.
- Request must be `pending`.

Document status effect:

- No status change just by opening the request.

### Step 2A: QA Requests Changes

Implementation:

- Inserts summary comment and optional inline annotations.
- Updates approval request:
  - `status = changes_requested`.
- Sends Pulse/email to submitter.
- Writes audit action `sop_changes_requested`.

Document status effect:

- Approval request becomes `changes_requested`.
- The action does not update `sops.status`.

### Step 2B: QA Approves New SOP Without Training

Implementation:

- Approval request:
  - `status = approved`
  - `change_type = NULL`
- SOP:
  - `version = '00'`
  - `approved_by = QA user`
  - `approved_date = current date`
  - `training_required = false`
  - initially set to `active`.
- Inserts `sop_versions` row for revision `00`.
- Calls `activate_sop_effective`.

Document status effect:

- SOP becomes `active`.
- `effective_date` is set to the selected/effective date.
- `due_for_revision` is set to effective date plus 3 years.
- `retention_expires_at` is calculated from the SOP retention period.
- Revision history receives an entry.

### Step 2C: QA Approves New SOP With Training

Implementation:

- Approval request becomes `approved`.
- SOP:
  - `version = '00'`
  - `approved_by` and `approved_date` set
  - `training_required = true`
  - `training_deadline = 15 working days from current date`
  - `status = approved_pending_training`.
- Inserts `sop_versions` row.
- Does not call `activate_sop_effective` yet.

Document status effect:

- SOP becomes `approved_pending_training`.
- SOP is approved but not effective/active through the effective-date release flow until training threshold passes.

### Step 2D: QA Approves SOP Update/Revision

Implementation:

- Approval request becomes `approved`.
- Current SOP revision is normalized to two digits.
- New revision is generated by incrementing current revision:
  - `00 -> 01`
  - `01 -> 02`
  - and so on.
- Inserts a new `sop_versions` row using the submitted file.
- Creates a Change Control.
- Updates SOP:
  - `approved_by = QA user`
  - `approved_date = current date`
  - `training_required = selected option`
  - `training_deadline = 15 working days if training is required`
  - `reason_for_change` is carried from request when present.
- Appends revision history.

Document status effect:

- Change Control creation sets:
  - `sops.status = pending_cc`
  - `sops.locked = true`
- Revised document does not become effective at QA approval.
- It waits for Change Control signatures and reconciliation.

## 4. SOP Change Control Signing And Reconciliation

Implemented entry point:

- UI: `/change-control/[id]`.
- Server actions: `signChangeControl`, `waiveSignature`, `confirmChangeControlReconciliation`.
- Database RPCs/triggers: `check_cc_completion`, `confirm_cc_reconciliation`.

This is the flow created automatically after QA approves an SOP update/revision.

### Step 1: Change Control Created

Implementation:

- Created by `approve_sop_request` through `create_change_control`.
- Required signatories are active managers in the SOP department plus the QA approver.
- Change Control stores:
  - old version
  - new version
  - old file URL
  - new file URL
  - required signatories
  - deadline
  - issuing QA user.

Document status effect:

- `change_controls.status = pending`.
- `sops.status = pending_cc`.
- `sops.locked = true`.
- Further updates to that SOP are blocked while locked.

### Step 2: Signatories Sign

Implementation:

- User must be active and have a signature on file.
- User cannot sign twice.
- Signing inserts a `signature_certificates` row.
- Audit and Pulse notifications are created.

Document status effect:

- No immediate SOP status change for a single signature.
- The Change Control remains `pending` until all required signatures are present or waived.

### Step 3: Admin Waives A Signature

Implementation:

- Only admins can waive.
- Uses `waive_cc_signature`.
- Waived signatories count as complete for completion check.

Document status effect:

- No direct SOP status change.
- May allow Change Control to advance if all remaining signatures are complete.

### Step 4: All Signatures Complete

Implementation:

- `check_cc_completion` evaluates every required signatory.
- If each non-waived signatory has a certificate:
  - Change Control status becomes `pending_activation`.
  - `completed_at` is set.
  - Audit entry is written.
  - Pulse item tells QA copy reconciliation is required.

Document status effect:

- `change_controls.status = pending_activation`.
- SOP remains `pending_cc` and locked.
- Revised SOP still is not active/effective.

### Step 5: QA/Admin Confirms Reconciliation

Implementation:

- Only QA manager or admin.
- Only allowed when Change Control is `pending_activation`.
- QA enters reconciliation note and effective date.
- RPC updates Change Control:
  - `status = complete`
  - reconciliation actor/date/note set
  - `completed_at` preserved or set.
- RPC updates SOP:
  - `version = change_controls.new_version`
  - `file_url = change_controls.new_file_url`
  - `date_revised = current date`
  - `locked = false`
  - `status = active` if no training is required
  - `status = approved_pending_training` if training is required.
- If no training required, it calls `activate_sop_effective`.
- Revision history entry is updated with effective date when appropriate.

Document status effect:

- Change Control becomes `complete`.
- SOP leaves `pending_cc`.
- Without training: SOP becomes `active`, effective date/due-for-revision/retention fields are set.
- With training: SOP becomes `approved_pending_training`, not yet effective.

## 5. Training Gate And Effective Date Release

Implemented entry point:

- UI: approvals queue training gate.
- Server action: `setSopEffectiveDate`.
- Database RPC: `activate_sop_effective`.

### Step 1: SOP Waits At `approved_pending_training`

How it gets there:

- QA approves new SOP with training required.
- Change Control reconciliation completes for a revision that requires training.

Document status effect:

- SOP is approved but not active/effective.

### Step 2: QA Sets Effective Date

Eligibility:

- Only QA managers.
- If `training_required` is true:
  - At least one linked non-archived training module must exist.
  - Training assignments for those modules are counted.
  - Completion rate must meet `training_completion_threshold` on the SOP.
  - Default threshold in schema is 80.

Implementation:

- Calls `activate_sop_effective`.
- Sends Pulse item to SOP department.

Document status effect:

- SOP becomes `active`.
- `locked = false`.
- `effective_date` is set.
- `due_for_revision = effective date + 3 years`.
- `retention_expires_at` is calculated.
- Revision history receives an effective entry.

## 6. Training Process Effects On Documents

Implemented entry points:

- Training module actions in `actions/training.ts`.
- Database trigger `flag_training_modules_on_sop_update`.

Training does not directly approve or revise SOPs, but it controls whether an approved SOP can be released from `approved_pending_training` to `active`.

### Training Module Creation

Implementation:

- Can only link to an active SOP.
- Stores the SOP version at module creation.
- New module starts as `draft`.

Document status effect:

- No SOP status change.

### Training Module Publish/Archive

Implementation:

- Module status can move `draft -> published`.
- Module can become `archived`.
- Assignments are created only for published modules per action enforcement.

Document status effect:

- No immediate SOP status change.
- Published/non-archived modules are considered by the SOP training gate.

### Trainee Assignment/Completion

Implementation:

- Assignment statuses:
  - `not_started`
  - `in_progress`
  - `completed`
- Passing a digital attempt or recording paper completion marks assignment `completed`.

Document status effect:

- Completion percentage is used by `setSopEffectiveDate`.
- Once threshold is met, QA can release SOP to `active`.

### SOP Version Update Trigger

Implementation:

- When an active SOP's version changes, published linked training modules are marked `needs_review = true`.
- Pulse notification is sent to module creator.

Document status effect:

- No SOP status change.
- Training content is flagged stale against the new SOP version.

## 7. SOP Acknowledgement

Implemented entry point:

- UI: Library SOP detail acknowledgement button.
- Server action: `acknowledgeSop`.

### Step 1: User Acknowledges Active SOP Version

Eligibility:

- User must be active.
- User must belong to the SOP primary department or a secondary department.

Implementation:

- Inserts into `sop_acknowledgements`:
  - `sop_id`
  - `user_id`
  - `version`
- Duplicate acknowledgement is treated idempotently.

Document status effect:

- No SOP status change.
- Acknowledgement affects reports/dashboard health and proof of reading for the specific SOP revision.

## 8. SOP Retention And Destruction

Implemented entry points:

- Server actions exist: `markSopPendingDestruction`, `destroySopRecord`.
- Database RPCs enforce status guards.

### Step 1: Mark Pending Destruction

Eligibility:

- Only QA manager or admin.
- SOP must currently be `superseded`.

Implementation:

- Calls `mark_sop_pending_destruction`.
- Sets:
  - `status = pending_destruction`
  - `destruction_requested_by`
  - `destruction_requested_at`
  - `destruction_justification`.
- Writes audit log.

Document status effect:

- SOP changes from `superseded` to `pending_destruction`.

### Step 2: Destroy Record

Eligibility:

- Only QA manager or admin.
- SOP must currently be `pending_destruction`.

Implementation:

- Calls `destroy_sop_record`.
- Sets:
  - `status = destroyed`
  - `destroyed_by`
  - `destroyed_at`
  - `destruction_justification`.
- Writes audit log.

Document status effect:

- SOP changes from `pending_destruction` to `destroyed`.

## 9. Multi-Document Change Control Package

Implemented entry points:

- Requester UI: `/requests/change-control`.
- QA hub UI: `/requests/hub/change-control`.
- Server actions: `submitChangeControlRequest`, `screenChangeControlRequest`, `updateChangeControlStatus`.

This process is separate from the legacy SOP revision signing flow, although it uses the same `change_controls` table.

### Step 1: User Submits Package

Eligibility:

- Active authenticated user.

Implementation:

- User enters title, originating department, rationale, impact assessment, requested due date.
- User selects one or more active SOPs.
- App creates one `change_controls` row:
  - `status = submitted`
  - `submitted_at = now`
  - `requester_id = current user`
  - `affected_departments` from originating and selected SOP departments
  - `deadline` defaults to 14 days if not supplied.
- App creates one `change_control_documents` row per selected SOP:
  - document id/number/title/level/type/department
  - old revision from current SOP version
  - new revision initially blank
  - reason for change
  - training required from SOP.
- QA managers get Pulse notifications.
- Audit entry is written.

Document status effect:

- `change_controls.status = submitted`.
- `change_control_documents.review_status = pending` by default.
- No `sops.status` changes occur in this submission action.

### Step 2: QA Screening

Eligibility:

- QA manager or admin.

Implementation:

- QA can approve, request clarification, or reject.

Status effects:

- Approve:
  - `change_controls.status = approved_for_document_work`
  - clears clarification/rejection fields.
- Clarification:
  - `change_controls.status = clarification_requested`
  - sets `clarification_request`
  - sets `clarification_requested_at`.
- Reject:
  - `change_controls.status = rejected`
  - sets `rejection_reason`
  - sets `rejected_at`.

Document status effect:

- Package status changes.
- Individual SOP statuses are not changed.
- Individual `change_control_documents.review_status` values are not changed by this action.

### Step 3: QA Manual Lifecycle Updates

Eligibility:

- QA manager or admin.

Implementation:

- QA can manually move the package to:
  - `documents_in_review`
  - `signatures_pending`
  - `pending_reconciliation`
  - `pending_training`
  - `effective`
  - `closed`

Document status effect:

- Only `change_controls.status` changes.
- The implementation does not automatically activate/revise selected SOPs from this package workflow.

## 10. General Document Requests

Implemented entry points:

- User requests page.
- QA requests page.
- Server actions: `submitDocumentRequest`, `markRequestReceived`, `markRequestApproved`, `markRequestFulfilled`.
- Database RPCs: `mark_request_received`, `mark_request_approved`, `mark_request_fulfilled`.

### Step 1: Submit Request

Eligibility:

- Active authenticated user.

Implementation:

- User submits free-text request body.
- Request body must be 10-2000 characters.
- Inserts `document_requests` row:
  - requester identity snapshot
  - `status = submitted`
  - generated reference number `REQ-YYYY-NNNN`.
- QA managers receive Pulse items.
- Audit entry is written.

Document status effect:

- This creates a request record only.
- It does not mutate SOP/document statuses.

### Step 2: QA Marks Received

Eligibility:

- QA manager.

Implementation:

- RPC only updates if current status is `submitted`.
- Sets:
  - `status = received`
  - `received_at`
  - `received_by`.
- Notifies requester.
- Writes audit.

Document status effect:

- Request status changes from `submitted` to `received`.
- No SOP/document status changes.

### Step 3: QA Approves

Eligibility:

- QA manager.

Implementation:

- RPC updates if current status is `submitted` or `received`.
- Sets:
  - `status = approved`
  - `approved_at`
  - `approved_by`
  - `qa_notes`.
- Notifies requester.
- Writes audit.

Document status effect:

- Request status changes to `approved`.
- No SOP/document status changes.

### Step 4: QA Fulfils

Eligibility:

- QA manager.

Implementation:

- RPC only updates if current status is `approved`.
- Sets:
  - `status = fulfilled`
  - `fulfilled_at`
  - `fulfilled_by`
  - `qa_notes` is updated if supplied.
- Notifies requester.
- Writes audit.

Document status effect:

- Request status changes from `approved` to `fulfilled`.
- No SOP/document status changes.

## 11. Custom Request Forms And Submissions

Implemented entry points:

- QA request hub for form building.
- User requests page for form submission.
- Server actions in `actions/request-forms.ts`.
- Database RPCs in request form migration.

### Form Template Lifecycle

Statuses/flags:

- `is_published`
- `is_archived`
- `version`

#### Create Form

Eligibility:

- QA manager.

Implementation:

- Creates `request_forms` row with `is_published = false`, `is_archived = false`, `version = 1`.
- Inserts fields.
- Writes audit.

Document status effect:

- Creates a request form template only.
- No SOP/document status changes.

#### Update Form

Eligibility:

- QA manager.
- Cannot edit archived form.

Implementation:

- Updates title/description/target department.
- Increments `version`.
- Replaces all fields.
- Writes audit.

Document status effect:

- Form template version increments.
- Existing submissions keep their frozen `form_snapshot`.
- No SOP/document status changes.

#### Publish/Unpublish Form

Eligibility:

- QA manager.
- Cannot publish archived form.
- Publishing requires at least one field.

Implementation:

- Publish sets:
  - `is_published = true`
  - `published_at`
  - `published_by`.
- Unpublish sets:
  - `is_published = false`
  - `published_at = null`
  - `published_by = null`.

Document status effect:

- Controls whether users can submit the form.
- No SOP/document status changes.

#### Archive Form

Eligibility:

- QA manager.

Implementation:

- Sets:
  - `is_archived = true`
  - `is_published = false`
  - `archived_at`
  - `archived_by`.

Document status effect:

- Form no longer accepts submissions.
- No SOP/document status changes.

### Request Form Submission Lifecycle

Implemented statuses:

- `submitted`
- `received`
- `approved`
- `fulfilled`
- `rejected`

#### Submit Form

Eligibility:

- Active, approved, onboarded user.
- Form must be published and not archived.

Implementation:

- Validates answers according to field types and required flags.
- Saves frozen `form_snapshot`.
- Inserts answers and requester identity snapshot.
- New submission status defaults to `submitted`.
- Generated reference number is `RFS-YYYY-NNNN`.
- QA managers receive Pulse.
- Audit entry is written.

Document status effect:

- Creates request form submission only.
- No SOP/document status changes.

#### QA Marks Received

Eligibility:

- QA manager.

Implementation:

- RPC updates only if status is `submitted`.
- Sets:
  - `status = received`
  - `received_at`
  - `received_by`.

Document status effect:

- Submission moves `submitted -> received`.
- No SOP/document status changes.

#### QA Approves

Eligibility:

- QA manager.

Implementation:

- RPC updates only if status is `submitted` or `received`.
- Sets:
  - `status = approved`
  - `approved_at`
  - `approved_by`
  - `qa_notes`.

Document status effect:

- Submission moves to `approved`.
- No SOP/document status changes.

#### QA Fulfils

Eligibility:

- QA manager.

Implementation:

- RPC updates only if status is `approved`.
- Sets:
  - `status = fulfilled`
  - `fulfilled_at`
  - `fulfilled_by`
  - `qa_notes`.

Document status effect:

- Submission moves `approved -> fulfilled`.
- No SOP/document status changes.

#### QA Rejects

Eligibility:

- QA manager.
- Rejection reason required.

Implementation:

- RPC updates only if status is `submitted` or `received`.
- Sets:
  - `status = rejected`
  - `rejected_at`
  - `rejected_by`
  - `qa_notes = rejection reason`.

Document status effect:

- Submission moves to `rejected`.
- No SOP/document status changes.

## 12. AI SOP Builder

Implemented entry points:

- `/sop-builder`.
- API routes under `/api/sop-builder/...`.
- Tables from `050_ai_sop_builder.sql`.

This process generates draft SOP content and Word exports. It does not insert records into the controlled `sops` Library table by itself in the schema/actions reviewed.

### Session Lifecycle

Implemented `sop_builder_sessions.status` values:

- `intake`
- `awaiting_clarification`
- `outline_ready`
- `drafting`
- `draft_ready`
- `revising`
- `word_generated`
- `completed`
- `cancelled`

Document effect:

- These statuses track builder workspace progress only.
- They do not affect `sops.status`.

### Draft Lifecycle

Implemented `sop_builder_drafts.status` values:

- `generating`
- `ready`
- `superseded`
- `word_generated`
- `exported`

Document effect:

- Drafts are builder artifacts.
- Word generation/export records are stored in builder tables.
- No controlled SOP Library status changes were found from this process.

### Comments

Implemented `sop_builder_comments.status` values:

- `open`
- `resolved`
- `dismissed`

Document effect:

- Comments affect builder review only.
- No controlled SOP Library status changes.

## 13. Mobile Signature Capture

Implemented entry points:

- QR component.
- Mobile signing route `/m/[token]`.
- Table `mobile_signatures`.

### Step 1: Desktop Creates Signing Request

Implementation:

- Creates `mobile_signatures` row:
  - `status = pending`
  - expires after 15 minutes
  - tied to user id.

Document status effect:

- No document status change.
- This captures/updates a user's signature asset workflow, not a document approval status.

### Step 2: Mobile Completes Signature

Implementation:

- Anonymous or authenticated mobile user can update a pending, unexpired token.
- Must set:
  - `status = completed`
  - `signature_base64` not null.
- RLS prevents overwriting completed or expired requests.

Document status effect:

- No document status change.
- The captured signature can later be required by Change Control signing.

## Status Impact Summary

### Processes that directly mutate controlled SOP status

- SOP submission:
  - creates `pending_hod` or `pending_qa` for new SOPs.
- HOD endorsement:
  - `pending_hod -> pending_qa`.
- QA approval of new SOP:
  - `pending_qa -> active` or `approved_pending_training`.
- QA approval of SOP update:
  - creates Change Control and sets SOP to `pending_cc`, `locked = true`.
- Change Control reconciliation:
  - `pending_cc -> active` or `approved_pending_training`, and unlocks the SOP.
- Training gate release:
  - `approved_pending_training -> active`.
- Retention/destruction:
  - `superseded -> pending_destruction -> destroyed`.

### Processes that affect document governance but not SOP status

- SOP acknowledgement:
  - creates acknowledgement record for a specific version.
- Training module/assignment:
  - controls eligibility for Effective Date release, marks training content stale after SOP version change.
- General document requests:
  - request tracking only.
- Custom request forms:
  - request tracking only.
- Multi-document Change Control package hub:
  - package/register lifecycle only in current implementation.
- AI SOP Builder:
  - draft/export workspace only.
- Mobile signature capture:
  - signature asset workflow only.

## Gaps / Things To Scrutinize

These are not guesses; they are implementation observations that deserve review if the intended process is stricter than the current app behavior.

1. SOP approval requests have a `rejected` status, and UI filters include it, but I did not find an active SOP reviewer action that sets `sop_approval_requests.status = rejected`.
2. HOD/QA `requestChangesSop` updates only the approval request status to `changes_requested`; it does not update the SOP row status.
3. Existing SOP update submission creates an approval request but does not immediately mark the SOP pending review; the SOP changes only after QA approval creates Change Control.
4. Multi-document Change Control package lifecycle statuses do not currently propagate to selected SOP statuses or individual document review statuses.
5. `change_control_documents.review_status` and `training_status` have rich status sets, but I did not find active UI/actions that transition them directly.
6. `sops.status` values `draft`, `draft_in_review`, and `superseded` are supported by schema/UI, but the active transitions into them were not found in the reviewed app paths.
7. SOP destruction functions require `superseded`, but I did not find the process that marks a replaced SOP as `superseded`.
8. The active SOP revision flow uses the legacy single-SOP Change Control signing/reconciliation path, while the newer multi-document package hub uses manual package statuses. These two flows share the `change_controls` table but do not behave the same.


## **SOP Process Consolidation — What Needs to Change in SOP-Guard Pro**

Here is everything from the document, the current app, and industry standard practice, consolidated into specific actionable gaps and changes.

---

### **\[accepted\] 1\. Document Numbering System**

**What the document says:** SOPs follow a structured numbering format: `QA/SOP/007` — Department Code / Document Type / Sequential Number. Copy numbers follow `YY/DC/NNNN`. Logbook numbers follow `LOG/XX/DC/YYYY`.

**What the app currently does:** SOP numbers are free-text — the Manager types whatever they want (e.g. "SOP-001").

**What needs to change:** The SOP number field needs a structured format enforced at input. The format should be configurable per organisation but validate against a pattern. Minimum: `[DEPT-CODE]/SOP/[SEQUENTIAL]`. The system should suggest the next available number automatically when a new SOP is being created, preventing duplicates. The current unique constraint on `sops.sop_number` is correct but the format guidance is missing.

---

### **\[accepted\] 2\. Document Hierarchy — Four Levels**

**What the document says:** Documents are structured in four levels:

- Level I: Quality Manual and Policies (the Why)
- Level II: SOPs and Protocols (the How)
- Level III: Work Instructions, Specifications, Methods (the Details)
- Level IV: Records, Forms, Logs (the Proof)

**What the app currently does:** Everything is treated as a SOP. No hierarchy. No level distinction.

**What needs to change:** Add a `document_level` field to the `sops` table: `'level_1' | 'level_2' | 'level_3' | 'level_4'` with a display label. The Library filter tabs should include a Level filter. Training modules should preferentially link to Level II documents. Reports should be able to filter by level. This does not require a major restructure — it is one column and one filter.

---

### **\[accepted\] 3\. Approval Workflow — Multi-Stage, Not Just QA**

**What the document says:** The approval chain is: Prepared By (User Dept) → Reviewed by User HOD/Designee → Reviewed by QA → Approved by QA Head/Designee.

That is four stages before a document becomes effective. The current app collapses this to two: submitter and QA.

**What needs to change:** The approval flow needs an intermediate step. Before QA sees the submission, the submitter's Head of Department (HOD — their M anager) should review and formally endorse it. The flow becomes:

Employee drafts SOP

    ↓

Submits to HOD (their department Manager) for initial review

    ↓

HOD endorses → sends to QA

    ↓

QA reviews → requests changes or approves

    ↓

Active

In the app this means: when an Employee submits a SOP, it goes to their department Manager first (not directly to QA). The Manager gets a Pulse notification. The Manager can endorse it (forward to QA) or return it with comments. Only endorsed submissions appear in the QA queue. Managers submitting their own SOPs skip the HOD step and go directly to QA.

This is a significant workflow change that touches `sop_approval_requests`, the Pulse notification logic, the Approvals page, and the submission server action. It should be implemented as a new `approval_stage` column: `'hod_review' | 'qa_review'`.

---

### **\[accepted\] 4\. Effective Date vs Approval Date — They Are Different**

**What the document says:** After QA approves, the document is issued for training. Training must be completed within 15 working days. Only after training is completed does QA stamp the document with an Effective Date and it becomes operative. The Effective Date is NOT the approval date.

**What the app currently does:** When QA approves, the SOP goes Active immediately. There is no training gate before it becomes operative.

**What needs to change:** This connects directly to the Training module. The correct flow for an updated SOP is:

QA Approves

    ↓

SOP status \= 'approved_pending_training' (new status)

Training module assigned to all relevant personnel

    ↓

Training completed within 15 working days

    ↓

QA sets Effective Date → SOP status \= 'active'

Add `effective_date date` and `approved_date date` as separate columns on `sops`. The `approved_date` is set when QA approves. The `effective_date` is set manually by QA after training is complete (or automatically if no training is required — QA has a toggle). The app currently only has one date which serves both purposes incorrectly.

---

### **\[addressed\] 5\. Version Numbering — The Correct Convention**

**What the document says:** The revision history shows versions as `00`, `01` with effective dates. The document itself is `QA-SOP-007-02` — meaning version 02 of document QA-SOP-007. Revision history tracks the Change Control number and approval date for each version.

**What industry standard says:** GMP-compliant version numbering is: `00` for initial issue, `01` for first revision, `02` for second revision. Some organisations use `v1.0`, `v1.1` etc. but the simpler two-digit format (`00`, `01`) is more common in pharmaceutical GMP environments.

**What the app currently does:** Version format is `vMAJOR.MINOR` (e.g. v1.0, v1.1, v2.0). Minor changes increment the decimal, significant changes increment the major number.

**The reconciliation:** The `vMAJOR.MINOR` format is acceptable and actually more informative than simple sequential numbering. However, the Change Control must always record: the old version number, the new version number, the CC reference number, and the approval date — exactly as the Revision History table in the document shows. The app already captures this but the `sops` table needs a `revision_history jsonb` column that accumulates every version transition with CC number and date, so it can be displayed on the SOP and exported in reports. This mirrors the "REVISION HISTORY" section at the bottom of the physical document.

**Final Verdict (what we should go with):** So we will go with what is stated in the document. Do not deviate… for this section.

---

### **\[accepted\] 6\. Change Control — The Correct Trigger**

**What the document says:** All new documents AND all revisions must go through Change Control (`SOP No. QA/006`). This is referenced twice. Change Control is initiated before the document is even drafted — not after QA approves it.

**What the app currently does:** Change Control is triggered automatically by QA approving an update. New SOPs skip Change Control entirely.

**The reconciliation:** The document's Change Control process for document creation is a separate upstream process — it covers initiating the decision to create or revise a document. The app's Change Control covers the signing-off of the revised document once approved by QA. These are two different uses of the term "change control" in GMP environments. The app's implementation (CC triggered on QA approval of an update, requiring management signatures) is correct for the purpose of document version sign-off. However, the app should add a "Reason for Change" field to the SOP submission form — the submitter must state the business or quality justification for the revision. This becomes the CC rationale.

Additionally: given the demo feedback that one CC can cover multiple SOPs, the multi-SOP CC architecture discussed in the demo notes is now confirmed as necessary — a regulatory change affecting five procedures should produce one CC that tracks all five, not five separate CCs.

---

### **\[accepted\] 7\. Document Watermarks and Copy Status**

**What the document says:** Physical documents carry stamps: MASTER COPY, CONTROLLED COPY, UNCONTROLLED COPY, DISPLAY COPY, DRAFT. Each has a specific meaning and controlled distribution. The DRAFT watermark is applied diagonally across each page during review.

**What the app currently does:** There are status badges (Draft, Pending QA, Active, Superseded) on the SOP record. The viewer renders the raw document without any watermark or copy status overlay.

**What needs to change:** The SOP viewer should overlay a status watermark on the rendered document matching the document's current status:

- `draft` or `pending_qa` → diagonal "DRAFT" watermark in amber
- `superseded` → diagonal "SUPERSEDED" watermark in grey
- `active` \+ user is viewing a cross-department SOP → a "REFERENCE COPY" banner
- `active` \+ user's own department → no watermark (clean operative document)

This is a CSS overlay on the viewer container — not a modification to the file. Positioned absolute, text rotated 45 degrees, low opacity, non-selectable.

---

### **\[accepted\] 8\. Document Request Form**

**What the document says:** Users raise a formal Document Request Form (Format No: QA/SOP/007/F03-02) to receive controlled copies of documents. QA reviews, approves, and issues copies. The issuance is logged in the Daily Document Issuance Record.

**What the app currently does:** The Document Request feature built in `RequestFlowBuild.md` covers this workflow. The flow (submit → QA received → QA approved → fulfilled) maps directly to the physical Document Request Form → QA review → issuance process.

**What needs to change:** The Document Request form should explicitly reference document numbers and titles in its free-text field. The auto-fill metadata already captures department and requester details. When a request is fulfilled, QA should be able to record the document reference number(s) that were issued in the QA Notes field. This creates the digital equivalent of the Daily Document Issuance Record. The `training_log` and `document_requests` records together replace the physical logbooks.

---

### **\[accepted\] 9\. Review Period and Due for Revision**

**What the document says:** The generic review period for all GMP documents is every three years. Documents must be reviewed at this interval regardless of whether there are changes.

**What the app currently does:** There is a `due_for_revision date` column on `sops` and a KPI card on the dashboard counting SOPs due within 30 days.

**What needs to change:** When a new SOP is approved and an Effective Date is set, the system should automatically calculate and set `due_for_revision = effective_date + 3 years`. This should not require manual entry — it is a calculated field. The cron job for training deadlines should also check for SOPs approaching their review date (30 days out) and send a Pulse notification to the SOP owner (the original submitter or the department Manager). The Reports section should have a dedicated "Documents Due for Review" view showing all SOPs whose `due_for_revision` is within the next 90 days.

---

### **\[accepted\] 10\. Retention Periods**

**What the document says:** Specific retention rules:

- Batch manufacturing/testing/distribution records: 1 year after batch expiry OR 5 years after batch certification (whichever is longer)
- Marketing authorization records (validation, stability): entire product lifecycle
- Electronic records must remain accessible and readable throughout the retention period

**What the app currently does:** No retention tracking. SOPs are soft-deleted to `superseded` status but no retention period is assigned and no destruction workflow exists.

**What needs to change:** Add `retention_period_years int` to the `sops` table with a default of 3 (configurable by document type). Add `retention_expires_at date` calculated as `effective_date + retention_period_years years`. When `retention_expires_at < today` and the SOP is `superseded`, it should be flagged for Admin review. A new Destruction Workflow (light version) should allow QA/Admin to mark a superseded document as `pending_destruction` → review → `destroyed`. Every destruction is logged permanently in the audit log with the actor, date, and justification. The physical document record is never hard-deleted — only its status changes to `destroyed`.

---

### **\[accepted\] 11\. Reconciliation of Old Copies Before New Issue**

**What the document says:** Before a new version of a document is issued, all existing controlled copies of the old version must be retrieved. A new logbook is only issued when the old one is returned. No format is revised without retrieving all old copies first.

**What the app currently does:** When a Change Control completes and a new version goes Active, the old version goes to `superseded` automatically. There is no retrieval confirmation step.

**What needs to change:** Add an acknowledgement gate to the Change Control completion. Before the new version goes fully Active, QA must confirm that the previous version has been reconciled — existing physical copies retrieved if applicable, and digital acknowledgements for the old version are noted as superseded. In the app, this means: when a CC completes, QA sees a brief confirmation step: "Confirm that all issued copies of v\[X\] have been reconciled before activating v\[Y\]." Checking this box and confirming is what triggers the status change to Active. This confirmation is logged in the audit trail.

---

### **\[accepted\] 12\. Training Completion Before Effectiveness**

**What the document says:** Training shall be imparted within 15 working days of document issuance. The document only becomes effective after training is completed. The user department returns the issued document to QA after training, and QA then applies the MASTER COPY stamp with the Effective Date.

**What the app currently does:** Training is a separate module with its own assignment and tracking. There is no enforcement link between training completion and SOP effectiveness.

**What needs to change:** The SOP status flow needs an optional training gate that QA can activate at approval time. When activated: the SOP enters `approved_pending_training` status. The system automatically creates a training module linked to this SOP (or notifies the relevant Manager to create one). A 15-working-day deadline is calculated and displayed. QA can see on the Approvals page which recently-approved SOPs are in the training gate and what their deadline is. When the training completion threshold is met (configurable — e.g. 80% of assigned personnel), QA receives a notification to set the Effective Date. Setting the Effective Date moves the SOP to `active`. This makes the training module and the SOP lifecycle directly connected rather than parallel systems.

---

### **\[accepted\] 13\. Cross-Functional Review Before Submission to QA**

**What the document says:** Before QA sees a document, it must be cross-functionally reviewed by all affected departments. Each reviewer uses Track Changes in Word. Each reviewer signs to confirm the document is technically acceptable. Only after all cross-functional reviewers have signed is the document submitted to QA.

**What the app currently does:** There is no cross-functional review stage. A Manager uploads the SOP and it goes directly to QA.

**What needs to change:** Add an optional pre-submission cross-functional review stage. When a Manager initiates a new SOP or revision, they can tag other departments for review (the secondary departments concept already exists for this). Tagged departments receive a Pulse notification. Each reviewer can leave comments on the document (this connects to the "direct commenting on documents" from the demo notes). The submitter consolidates all feedback and re-uploads the final draft before formally submitting to QA. This stage has its own status: `draft_in_review`. QA never sees the document until the submitter explicitly marks cross-functional review as complete and formally submits. This is the missing step between "draft" and "pending_qa" in the current status model.

---

### **Consolidated Status Model — The Correct One**

Taking everything above together, here is the complete corrected SOP status progression for the app:

draft

    ↓

draft_in_review (cross-functional review — optional stage)

    ↓

pending_hod (HOD/Manager endorsement — for employee submissions)

    ↓

pending_qa (in QA review queue)

    ↓

approved_pending_training (QA approved, training gate active — optional)

    ↓

pending_cc (Change Control issued for updates — signatures being collected)

    ↓

active (Effective Date set — fully operative)

    ↓

superseded (replaced by newer active version)

    ↓

pending_destruction (retention period expired — awaiting formal destruction approval)

    ↓

destroyed (logged and closed — record remains in system permanently)

The current app has: `draft → pending_qa → pending_cc → active → superseded`. The full model adds five stages that are each meaningful in a GMP-regulated pharmaceutical environment.

---

### **Priority Order for Implementation**

**Must have for a pharmaceutical client:**

1. Effective Date separate from Approval Date
2. Revision History as a structured record on every SOP
3. `due_for_revision` auto-calculated from Effective Date \+ 3 years
4. Document level classification (Level I–IV)
5. Version watermark overlay in the SOP viewer
6. Training gate before SOP effectiveness

**Important but can follow:** 7\. HOD endorsement stage in the approval workflow 8\. Structured SOP numbering with format enforcement 9\. Reason for Change field on submission form 10\. Cross-functional review stage 11\. Reconciliation confirmation before new version activates 12\. Retention period tracking and destruction workflow 13\. Multi-SOP Change Controls (already in progress from demo feedback)

**The single most important change from a compliance standpoint** is separating the Approved Date from the Effective Date and adding the training gate between them. In a GMP inspection, an auditor will specifically ask: when was this procedure approved, when was training completed, and when did it become operative? These must be three distinct and separately recorded events. Right now the app conflates them into one. That is the first thing to fix.

## **Additions during the Meeting**

Add SOP MASTER INDEX  
 There should be a submenu under the SOP Library page that will have the MASTER Index for all departments

Example:  
SOP LIBRARY  
 SOP MASTER INDEX  
 QA SOP LIST  
 QC SOP LIST   
 PRODUCTION SOP LIST  
 ENGINEERING SOP LIST  
 WAREHOUSE SOP LIST  
 HR SOP LIST

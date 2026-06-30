# Audit — SOP Library & SOP Lifecycle

Domain owner files audited: `app/(dashboard)/library/*`, `components/library/*`, `actions/sop.ts`, `lib/utils/version.ts`, `app/api/storage/sop-upload/route.ts`, `components/approvals/sop-upload-modal.tsx`, `lib/queries/sops.ts`, migrations 003/045/046/048.

Reading the actual lifecycle: upload (`/api/storage/sop-upload`) → `submitSopForApproval` (creates `sops` row `version='00'`, status `pending_hod`/`pending_qa`) → HOD `endorseSopToQa` → QA `approveSopRequest` (RPC `approve_sop_request`) → for `new` SOP goes active (or `approved_pending_training` → `setSopEffectiveDate`); for `update` issues a Change Control, sets `pending_cc` + `locked`. Acknowledge, destruction, reject paths exist.

---

## CRITICAL

### C1. "Submit Edit" is a dead button everywhere — there is NO way to revise an existing active SOP
**Location:** `components/library/sop-library-table.tsx:203-210` (dropdown item) and `app/(dashboard)/library/[id]/library-view-client.tsx:201-207` (header button).
**What's wrong:** Both "Submit Edit" controls render with no `onClick`/handler. The table item is a bare `<DropdownMenuItem>Submit Edit</DropdownMenuItem>` (only toggles a `disabled` prop when locked). The view-client button is a plain `<Button>...Submit Edit</Button>`. Neither opens the upload modal in "update" mode, nor calls any action. The only working entry to revise an SOP is the global "Upload SOP" button → modal → "Update Existing" dropdown.
**Real-world impact:** From the SOP detail page (the natural place a manager lands to revise a document), clicking "Submit Edit" does nothing. The advertised per-SOP revision flow is non-functional; users will think the app is broken. The entire `update`/Change-Control lifecycle is only reachable via an unrelated top-level button.
**Fix:** Wire both buttons to open `SopUploadModal` pre-seeded with `sopType='update'` and `selectedSopId=sop.id`.

### C2. Library page counts/list and Master Index can disagree, and the library "All" view silently drops statuses for non-admins
**Location:** `lib/queries/sops.ts:26-39`.
**What's wrong:** For a non-admin, non-QA manager with **no** status filter selected, the query restricts to a hardcoded status whitelist (line 31): `['draft','draft_in_review','pending_hod','pending_qa','approved_pending_training','pending_cc','active','superseded','pending_destruction']`. Any SOP whose status is not in this list (e.g. `destroyed`, `archived`, or any future/legacy status) is silently excluded from the "All" tab **and from the `count: 'exact'` total** shown in pagination ("… · N SOPs"). The employee branch hard-filters to `active` only. Meanwhile the Master Index (`master-index/page.tsx`) uses the service client and shows `status='active'` across *all* departments. So the "All / N SOPs" figure on the Library is neither all statuses nor all departments and won't reconcile with Master Index.
**Real-world impact:** The headline SOP count a manager sees is partial and changes meaning depending on which tab is active; SOPs in unlisted states vanish without explanation. In a regulated QMS, "documents that silently disappear from the register" is a real audit problem.
**Fix:** Drive the "All" status set from a single source of truth (or remove the whitelist and rely on RLS), and label the count as filtered, or compute counts server-side consistently with Master Index.

---

## HIGH

### H1. Non-Level-II SOP numbers are user-entered with no uniqueness/format guard — duplicates possible
**Location:** `actions/sop.ts:108-135` + DB trigger `enforce_level_ii_sop_number` (`048_…:332-352`).
**What's wrong:** For Level I/III/IV documents the upload modal lets the user type `sopNumber` freely (`sop-upload-modal.tsx:225` sends `sopNumber.trim()` when `documentLevel !== 'level_2'`). `submitSopForApproval` inserts that string verbatim (line 124). The DB validity trigger only fires for `document_level = 'level_2'` (`048:337`), and there is **no unique constraint** on `sops.sop_number`. So two Level III/IV docs can be created with identical SOP numbers, or with malformed numbers.
**Real-world impact:** Duplicate / inconsistent controlled-document numbers — a direct GMP document-control violation. Master Index will list collisions.
**Fix:** Add a server-side format + uniqueness check for non-Level-II numbers (or a DB unique index on `sop_number` where `document_type='SOP'`).

### H2. "Version History" dropdown item and "View Archive" button are dead
**Location:** `components/library/sop-library-table.tsx:201` (`<DropdownMenuItem>Version History</DropdownMenuItem>`, no handler); `components/library/version-history-button.tsx:24-29` renders `<VersionHistorySheet>` **without** passing `onViewVersion`, so the "View Archive" button at `version-history-sheet.tsx:89-96` calls `onViewVersion?.(version)` = no-op.
**What's wrong:** Two version-history affordances render but do nothing. The table's "Version History" item never opens the sheet; the sheet's per-version "View Archive" never loads the archived `file_url` (the sheet receives versions but has no way to view an old document).
**Real-world impact:** Users cannot open a prior version's document from the UI even though `sop_versions.file_url` is stored. For a QMS, retrieving superseded versions is a core compliance need.
**Fix:** Wire the table item to open the sheet; pass an `onViewVersion` that signs and opens the archived `file_url` (e.g. via `SopReadModal`).

### H3. "Copy SOP Number" dropdown item does nothing
**Location:** `components/library/sop-library-table.tsx:212`.
**What's wrong:** `<DropdownMenuItem>Copy SOP Number</DropdownMenuItem>` has no `onClick`; nothing is copied to clipboard.
**Real-world impact:** Minor but a visibly broken menu action (false affordance).
**Fix:** Add `onClick={() => navigator.clipboard.writeText(sop.sop_number)}`.

### H4. `incrementVersion()` (TS util) is buggy AND unused — version logic actually lives in SQL
**Location:** `lib/utils/version.ts:1-10`; canonical logic is `increment_sop_version` in `046_…:41-59`.
**What's wrong:** `incrementVersion` is referenced nowhere in the app (grep: only itself + docs). The real increment happens in the DB RPC. Worse, the TS version's legacy branch is mathematically wrong for the documented scheme: for `"v1.0"` it returns `"01"` (computes `1-1+0=0`, +1 → 1) instead of normalizing v1.0 → `00` like the SQL does, and for plain `"00"` → `"01"` it happens to agree, but any legacy `vMAJOR.MINOR` diverges from `sop_normalize_revision`. CLAUDE.md still claims versions follow `vMAJOR.MINOR` and that this helper is used.
**Real-world impact:** Dead, incorrect helper is a trap — if anyone wires it up (it's the "obvious" util), versions will diverge from the DB source of truth. Documentation is misleading.
**Fix:** Delete `lib/utils/version.ts` (or have it call/match `sop_normalize_revision`), and correct CLAUDE.md.

---

## MEDIUM

### M1. `signChangeControl` stores the access token (JWT) in the `ip_address` audit field
**Location:** `actions/sop.ts:971-981`.
**What's wrong:** `const forwardedFor = (await client.auth.getSession()).data.session?.access_token; const ipAddress = forwardedFor` — the signature certificate's `ip_address` column is populated with the user's **JWT access token**, not an IP. Also uses `getSession()` which CLAUDE.md forbids server-side.
**Real-world impact:** The audit trail's "IP address" is meaningless (and a secret token is persisted in a long-lived audit table — a security/data-leak concern). 21 CFR Part 11 expects a real captured IP/host.
**Fix:** Read the real client IP from request headers (`x-forwarded-for`) and store that; never store the access token.

### M2. Email subject/body interpolate `sop_id` (a UUID) instead of the SOP number/title
**Location:** `actions/sop.ts:527` (`subject: \`SOP Activated: ${request.sop_id}\``), `:569` (`Change Control Issued: ${request.sop_id}`), `:909` (`Revision Requested: ${request.sop_id}`), `:1032` & `:1034` (`CC Signed: ${changeControl?.sop_id}`).
**What's wrong:** These notification emails put a raw UUID where a human-readable SOP identifier belongs. The code already has `sopLabel`/`sopTitle` in scope at most of these sites but uses `request.sop_id`.
**Real-world impact:** Recipients get emails like "SOP Activated: 3f9a…-uuid" — confusing, unprofessional, and not traceable to a document.
**Fix:** Use `sopLabel`/`sopTitle` in subject and message.

### M3. SOP detail page is viewable by users outside the SOP's department even when status is NOT active
**Location:** `app/(dashboard)/library/[id]/page.tsx:35-43` (fetches via user client, redirects only if row null).
**What's wrong:** The cross-department read-only exposure is *intended only for `status='active'`* (per CLAUDE.md / `sop-viewer` "Reference Copy" banner is gated on `status==='active' && isCrossDepartment`). But the detail page loads any SOP the RLS lets through and renders it; if RLS allows a manager to read another department's `draft`/`pending_qa` row, the viewer shows a DRAFT watermark but still renders another department's unapproved document. (needs verification of the exact RLS read policy on `sops`.)
**Real-world impact:** Potential leak of other departments' in-progress/draft SOP content beyond the intended "active-only" cross-dept search exposure.
**Fix:** Verify RLS limits cross-dept reads to `active`; if not, gate the detail page so non-own-dept users can only open `active` SOPs.

### M4. Master Index ignores `secondary_departments` when grouping/filtering by department
**Location:** `components/library/sop-master-index-client.tsx:38` and `app/(dashboard)/library/master-index/page.tsx:152`.
**What's wrong:** Department filter compares only `sop.department` (primary). An SOP shared into a secondary department is not surfaced when filtering by that secondary department, and the `departmentOptions` list is built only from primary departments + the department table. The library table query (`sops.ts:36`) *does* include `secondary_departments`, so the two surfaces are inconsistent.
**Real-world impact:** A document co-owned by Dept B won't appear under Dept B in the Master Index, inconsistent with the Library list.
**Fix:** Include `secondary_departments` membership in the Master Index filter to match library behavior.

---

## LOW

### L1. Library "All / N SOPs" total only renders when `totalPages > 1`
**Location:** `components/library/sop-library-table.tsx:323`.
**What's wrong:** The count line (`… · {totalCount} SOPs`) is inside `{totalPages > 1 && (…)}`. With ≤25 results the user never sees the total.
**Impact:** Minor: no at-a-glance count for small result sets.
**Fix:** Show the count independent of pagination.

### L2. Acknowledge button has no success/refresh — relies on full re-render
**Location:** `components/library/acknowledge-button.tsx:33-34`; `library-view-client.tsx:125-130` never passes `onAcknowledged`.
**What's wrong:** On success the action `revalidatePath('/library')` runs, but the detail page is `/library/[id]`, not `/library`; `onAcknowledged` is undefined, so the button does not flip to the "Acknowledged" state until a manual reload.
**Impact:** User clicks Acknowledge, sees the spinner stop, but the button stays in "Acknowledge" state — looks like it failed.
**Fix:** `revalidatePath('/library/[id]','page')` or pass an `onAcknowledged` that refreshes/optimistically updates.

### L3. `previewNextSopNumber` action exists but preview in modal is computed via an effect — possible double source
**Location:** `actions/sop.ts:28-48` vs modal effect at `sop-upload-modal.tsx:183-205`. (needs verification) The generated number on submit (`generate_next_sop_number`, `sop.ts:112`) is a *different* RPC that increments the sequence; preview just reads it. Ensure preview shown == number assigned (race if two managers submit concurrently — both preview "003", one gets 003, other 004 silently). Acceptable, but the UI shows a number that may not be the one assigned.
**Fix:** Communicate that the previewed number is provisional until submit.

---

## Notes / verified-OK
- Cross-department read-only enforcement for **active** SOPs: viewer is a Microsoft Office iframe of a read-only signed URL with a "Reference Copy" banner; no edit affordance is rendered for cross-dept (`library-view-client.tsx:202` gates Submit Edit on `isOwnDept`). Inherent read-only is fine. (But see M3 for non-active statuses.)
- QA self-approval block is enforced in RPC (`046:181-183`) and HOD self-endorse blocked (`sop.ts:625`). Good.
- `approve_sop_request` named-arg call (`sop.ts:479`) omits `p_change_type`; since args are named and `p_change_type` has a default, this resolves correctly (no positional mismatch). OK.
- Upload route persists storage **path** as `file_url` and signs on read — consistent and correct (`sop-upload/route.ts:85-91`, detail page `:50-56`).

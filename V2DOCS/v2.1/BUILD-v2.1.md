# SOP-Guard Pro — BUILD.md
> **AI Agent Instruction File** | Version 2.1 | Star-Centralized Architecture
> This file is the single source of truth for building SOP-Guard Pro v2 phase by phase.
> Read this entire file before writing a single line of code.

---

## HOW TO USE THIS FILE

1. Read **GROUND RULES** and **SYSTEM REFERENCE** completely before starting Phase 0.
2. Execute **one PHASE at a time**. No skipping. No partial phases.
3. Run every item in the **PHASE CHECKLIST** before committing and moving on.
4. When you start a new session, read the **CURRENT STATE** section first.
5. When something is ambiguous, the answer is in this file. Read it again before guessing.

> **The most common agent mistake: building too much at once. Each phase is deliberately small. Resist the urge to build ahead.**

---

## GROUND RULES

These rules apply to every phase. No exceptions.

### Code Quality
- TypeScript strict mode everywhere. No `any` types. No `// @ts-ignore`. No casting through `unknown`.
- Every database operation handles the error case explicitly — never silently swallow errors.
- Never leave a `TODO` in committed code. Either build it or leave it out.
- All components are functional. No class components.
- Co-locate component files: a component and its TypeScript types live in the same folder.
- No business logic in components. Extract to hooks (`/hooks/`) or server actions (`/actions/`).

### Naming Conventions
- Files: `kebab-case.tsx` for components, `camelCase.ts` for utilities and hooks.
- Components: `PascalCase`.
- Database columns: `snake_case` (Postgres convention).
- TypeScript types: `PascalCase` prefixed with domain (e.g. `SopRecord`, `PmTask`, `PulseItem`).
- Zustand stores: `use[Name]Store` (e.g. `useSopTabStore`).
- TanStack Query keys: typed string arrays, e.g. `['sops', 'library', deptFilter]`.
- Server actions: `camelCase` verbs, e.g. `submitSopForApproval`, `logPmCompletion`.

### Styling Rules
- Tailwind utility classes only. No inline `style={{}}`. No CSS modules.
- Never use arbitrary values `[123px]` unless absolutely unavoidable — use the spacing scale.
- All colours reference the brand token system. Never hardcode hex values in className strings.
- The app is **light mode only** for MVP. No dark mode classes.

### Supabase Rules
- All queries go through the typed Supabase client. Never raw SQL strings in components.
- **RLS is the security layer.** Never trust the frontend for access control.
- Every table has RLS enabled. Policies are documented in the migration files.
- Use Supabase Auth for all authentication. Never roll custom auth.
- The `SUPABASE_SERVICE_ROLE_KEY` is server-side only. Never in a `NEXT_PUBLIC_` variable.
- Always use `supabase.auth.getUser()` on the server — never `getSession()` (it does not revalidate the JWT against the Supabase Auth server — it only reads the cookie).

### Component Rules
- Build shared components in `/components/ui/` before building pages that need them.
- Every shared component has a defined TypeScript props interface.
- Use Shadcn/UI as the base component system. Customise with `cn()` and Tailwind — never edit Shadcn source files directly.
- **Loading, empty, and error states are required for every data-fetching component.** Not optional. Not deferred to later.

### The Two-Layer Visibility Rule (Read This Carefully)
The SOP Library has two visibility modes. Both are enforced at the **query layer** — not at the RLS level.

**Important security context first:** Because the department filter is query-layer only, a user with a valid JWT can query any active SOP directly via the Supabase API, bypassing the application's department scoping. This is a **conscious, accepted design decision** — the search feature already exposes all active SOPs to all authenticated users. Active SOPs are considered non-confidential within the organisation. If a future client requirement ever demands that department walls hold at the database level (e.g. Engineering must never see Logistics SOPs, even in search), this entire approach must be revisited and RLS-level dept filtering reinstated. Document this decision in every code review.

1. **Default Library view** — shows only SOPs where `department = user.department` OR `user.department = ANY(secondary_departments)`. This is the table the user sees when they open the Library. Focused. No cross-department noise.
2. **Search mode** — when the user types in the search bar, the query runs across ALL Active SOPs in the entire organisation, no department filter. Results show a department badge on every row so the user always knows which department owns the SOP.

When a user opens a cross-department SOP (found via search):
- The viewer renders the document normally.
- The department badge in the header is highlighted (teal outline) to signal it is from another department.
- The action bar is **empty** — no Acknowledge button, no Submit Edit, no actions. Read-only.
- The ownership check: `sop.department === user.department || user.department IN sop.secondary_departments`. UI-level check only.

### Git Discipline
- One commit per phase minimum. Format: `phase-[N]: [short description]`
- Never commit `.env.local`. It must be in `.gitignore` from Phase 0.

---

## SYSTEM REFERENCE

### What Is SOP-Guard Pro?
An industrial SaaS platform for managing Standard Operating Procedures (SOPs) and Preventive Maintenance (PM). Built on a **star-centralized architecture**: the SOP Library and Equipment Registry are the two central hubs. Everything else — approvals, change control, PM planner, calendar, pulse, reports — orbits them. There are no department pages, no department navigation, no tree-node structure.

### The Identity Model — Three Attributes
Every user is fully described by three profile attributes:

| Attribute | Type | Values |
|-----------|------|--------|
| `department` | text (FK to departments.name) | Engineering, QA, Logistics, Maintenance, etc. |
| `role` | enum | `manager` \| `employee` |
| `is_admin` | boolean | `true` \| `false` |

These combine freely. The effective tiers are:

| Tier | Attributes | What They Can Do |
|------|-----------|-----------------|
| Employee | any dept · employee · false | Read active own-dept SOPs. Search all active SOPs (read-only cross-dept). Acknowledge SOPs. Complete PM tasks. Send notices. |
| Manager | any dept · manager · false | Everything Employee + Submit SOPs, sign Change Controls, manage PM, submit equipment. |
| Admin+Employee | any dept · employee · true | Employee permissions + manage users, manage dept list, view audit logs. |
| Admin+Manager | any dept · manager · true | Full operational + full admin. Primary power-user account. |
| QA Manager | QA · manager · false | Manager permissions + global Library/Equipment visibility + sole SOP/equipment approval authority. |
| QA Admin+Manager | QA · manager · true | Everything. The superuser. |

### Critical Principles (Read Every Time)
1. **The Gold Rule:** Employees only ever see `status = 'active'` SOPs. Enforced at the RLS level — not the UI level.
2. **QA is the sole approval authority.** No SOP becomes Active without QA sign-off. No equipment goes live without QA approval. Enforced in the `approve_sop_request` and `approve_equipment` server functions. QA Managers cannot approve their own SOP submissions — the function checks `submitted_by ≠ qa_user_id` and rejects with an error if they match.
3. **No in-app editor.** Users write SOPs in Microsoft Word externally. The app is a viewer, governance layer, and distribution system. Users upload `.docx` files. The app renders them read-only via `mammoth.js` + `DOMPurify`.
4. **Signatures are stored images + immutable DB records.** A handwritten signature image is stored in Supabase Storage during onboarding. When a Manager signs a Change Control, their stored image is shown in the confirmation modal and referenced in the immutable `signature_certificates` record.
5. **The Pulse is the primary work interface.** It is always visible. It never unmounts. One Supabase Realtime subscription per user. Everything — notices, alerts, approvals, to-dos — flows through it.
6. **Audit log is append-only.** No UPDATE or DELETE policy for any role. Written by server-side triggers and functions only. Every `is_admin` grant or revoke writes a dedicated audit entry.
7. **Soft-delete only — never hard-delete users.** Offboarding a user sets `profiles.is_active = false`. The profile row is never deleted — it is referenced by audit logs, signatures, and acknowledgements. Inactive users cannot log in (middleware rejects them) and are hidden from all application views, but their data integrity is preserved.
8. **Active SOPs are visible to the whole organisation via search.** This is a deliberate design decision. Active SOPs are not treated as confidential within the org. If this requirement changes, RLS-level dept filtering must be reinstated.

### Tech Stack (Locked — Do Not Deviate)
```
Framework:     Next.js 15 (App Router)
Language:      TypeScript strict
Database:      Supabase (PostgreSQL + RLS)
Auth:          Supabase Auth
Realtime:      Supabase Realtime
Storage:       Supabase Storage
AI:            Google Gemini Flash API
Styling:       Tailwind CSS + Shadcn/UI
Tables:        TanStack Table v8
Forms:         React Hook Form + Zod
State:         Zustand (UI state) + TanStack Query (server state)
Icons:         Lucide React — only. No other icon libraries.
Docx render:   mammoth.js (client-side, with DOMPurify sanitisation)
Diff:          diff-match-patch (pre-computed server-side)
Animations:    Magic UI (NumberTicker, AnimatedList, ShimmerButton, BorderBeam)
Layout base:   Shadcn blocks (dashboard-01, login-02, signup-02)
Hosting:       Vercel
```

### Colour Token System
```
brand-navy:  #0D2B55   TopNav bg, page headings, sidebar header
brand-blue:  #1A5EA8   H2 headings, links, info badges
brand-teal:  #00C2A8   CTA buttons, focus rings, active nav border, dividers
slate-50:    #F8FAFC   Page background
slate-100:   #F1F5F9   Alternate table rows, card backgrounds
slate-200:   #E2E8F0   Borders, dividers
slate-800:   #1E293B   Primary body text
red-600:     #DC2626   Overdue, errors, pending (Priority Pulse)
amber-600:   #D97706   Draft status, warnings, due-soon
green-600:   #059669   Active, approved, complete, signed
```

### Directory Structure (Build Exactly)
```
/app
  /(auth)
    /login/page.tsx
    /signup/page.tsx
    /onboarding/page.tsx
    /setup/page.tsx                    ← First-admin bootstrap (Phase 2)
  /(dashboard)
    /layout.tsx                        ← Shell: TopNav + Sidebar + Pulse + main
    /dashboard/page.tsx
    /library/page.tsx
    /library/[id]/page.tsx
    /approvals/page.tsx                ← QA only
    /approvals/[id]/page.tsx
    /change-control/[id]/page.tsx
    /equipment/page.tsx
    /equipment/[id]/page.tsx
    /calendar/page.tsx
    /reports/page.tsx
    /settings/page.tsx
/api
  /gemini/delta-summary/route.ts
  /gemini/risk-insights/route.ts
  /storage/sop-upload/route.ts
  /storage/signature/route.ts
  /cron/pm-alerts/route.ts
  /cron/overdue-check/route.ts
/components
  /ui/                                 ← Shadcn base + custom shared components
  /shell/                              ← TopNav, Sidebar, shell layout components
  /pulse/                              ← ThePulse, PulseItem renderers by type
  /library/
  /equipment/
  /change-control/
  /calendar/
  /reports/
/hooks/
/actions/
/lib
  /supabase/
    client.ts
    server.ts
    middleware.ts
  /utils/
    cn.ts
    dates.ts
    permissions.ts                     ← isOwnDept(), isQaManager(), canSign() helpers
    version.ts                         ← incrementVersion() helper
/types
  /app.types.ts
  /database.types.ts
/supabase
  /migrations/
```

---

## DATABASE SCHEMA REFERENCE

### Design Decisions Baked Into the Schema

**Soft-delete on profiles:** Users are never hard-deleted. `is_active = false` is the offboarding state. All foreign key references remain valid. Middleware rejects inactive users.

**Signatory snapshot on change_controls:** Required signatories are computed once when a CC is created and stored as `required_signatories jsonb`. This prevents new hires or transfers mid-CC from affecting signing requirements. The completion check always runs against the snapshot, not a live query.

**Pulse broadcast model:** Audience-wide notifications (department, everyone) create a **single** `pulse_items` row with `recipient_id = NULL`. The Realtime subscription and initial query filter by `audience + department` on the client side. Individual notifications (self, specific person) use `recipient_id = user_id` as before. This prevents fan-out explosions on large organisations.

**SOP approval request version tracking:** `sop_approval_requests` stores `file_url` and `version_label` at submission time. If QA requests changes and the user resubmits, the new file is a new row in the table. The full submission history is preserved.

**SOP lock during active CC:** `sops` has a `locked boolean DEFAULT false` column. When a CC is issued, the SOP is locked. The Submit Edit button is disabled for locked SOPs. The lock is released by the CC completion trigger (when the new version goes Active) or by Admin override.

**Version format:** SOP versions follow `vMAJOR.MINOR` format (e.g. `v1.0`, `v1.1`, `v2.0`). The `incrementVersion()` utility in `/lib/utils/version.ts` parses and increments the minor version by default. QA can elect to bump the major version on approval if the changes are substantial (a flag in the approval modal).

**Equipment secondary departments:** Equipment, like SOPs, can have a `secondary_departments text[]` array. This handles assets serviced by more than one department. Employees and Managers in a secondary department can view the asset and log PM completions but cannot submit edits.

**PM task assignment:** `pm_tasks.assigned_to` is required (NOT NULL) from the point an equipment record is approved. The Admin or Manager who registers the equipment sets the initial assignee in the Add Equipment modal. Tasks can be reassigned by Managers.

**Change Control deadline:** `change_controls` has a `deadline date` column, set to `created_at + 14 days` by default when the CC is created. A cron job checks daily and sends an escalation `pulse_item` to Admins for any CC where `deadline < today AND status = 'pending'`. Admins can waive a required signature with an audit record.

**Notice thread depth limit:** `pulse_items` threads (via `parent_id`) are capped at depth 1. A top-level notice can receive replies. Those replies cannot be replied to. The application enforces this: if `parent_id` is not NULL, the send-reply action is disabled and the UI shows no reply input on reply items.

---

### profiles
```sql
id                  uuid        PK — references auth.users
full_name           text        NOT NULL
department          text        NOT NULL REFERENCES departments(name)
role                text        NOT NULL CHECK (role IN ('manager','employee'))
is_admin            boolean     NOT NULL DEFAULT false
is_active           boolean     NOT NULL DEFAULT true     ← soft-delete flag
employee_id         text
job_title           text        NOT NULL
phone               text
avatar_url          text
signature_url       text
onboarding_complete boolean     NOT NULL DEFAULT false
notification_prefs  jsonb       DEFAULT '{"email": true, "pulse": true}'
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```
> Hard delete is never used. Offboarding = `is_active = false`. All FK references stay valid.

### departments
```sql
id          uuid        PK DEFAULT gen_random_uuid()
name        text        NOT NULL UNIQUE
colour      text        NOT NULL DEFAULT 'blue'
is_qa       boolean     NOT NULL DEFAULT false
created_at  timestamptz DEFAULT now()
```
> Deletion guard: a department with any active `profiles` or `sops` rows cannot be deleted. Enforced in the server action — check counts before attempting DELETE.

### sops
```sql
id                    uuid        PK DEFAULT gen_random_uuid()
sop_number            text        NOT NULL UNIQUE
title                 text        NOT NULL
department            text        NOT NULL REFERENCES departments(name)
secondary_departments text[]      NOT NULL DEFAULT '{}'
version               text        NOT NULL DEFAULT 'v1.0'
status                text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','pending_qa','active','superseded','pending_cc'))
locked                boolean     NOT NULL DEFAULT false   ← true while a CC is in progress
file_url              text
date_listed           date        DEFAULT CURRENT_DATE
date_revised          date
due_for_revision      date
submitted_by          uuid        REFERENCES profiles
approved_by           uuid        REFERENCES profiles
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
```
> `status = 'pending_cc'` is set when a CC is issued. The SOP is `locked = true` simultaneously. Submit Edit is disabled for locked SOPs.

### sop_versions
```sql
id           uuid        PK DEFAULT gen_random_uuid()
sop_id       uuid        NOT NULL REFERENCES sops
version      text        NOT NULL
file_url     text        NOT NULL
diff_json    jsonb
delta_summary text
uploaded_by  uuid        REFERENCES profiles
created_at   timestamptz DEFAULT now()
```

### sop_approval_requests
```sql
id             uuid        PK DEFAULT gen_random_uuid()
sop_id         uuid        NOT NULL REFERENCES sops
submitted_by   uuid        NOT NULL REFERENCES profiles
type           text        NOT NULL CHECK (type IN ('new','update'))
status         text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','changes_requested','approved','rejected'))
file_url       text        NOT NULL   ← URL of the file as submitted at this revision
version_label  text        NOT NULL   ← e.g. 'Submission 1', 'Resubmission 2'
notes_to_qa    text
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
```
> Every resubmission after changes-requested creates a NEW row in this table — it does not update the existing row. Full submission history is preserved. QA sees all rows for a SOP, ordered chronologically.

### sop_approval_comments
```sql
id          uuid        PK DEFAULT gen_random_uuid()
request_id  uuid        NOT NULL REFERENCES sop_approval_requests
author_id   uuid        NOT NULL REFERENCES profiles
comment     text        NOT NULL
action      text        CHECK (action IN ('comment','changes_requested','approved','resubmitted'))
created_at  timestamptz DEFAULT now()
```

### sop_acknowledgements
```sql
id              uuid        PK DEFAULT gen_random_uuid()
sop_id          uuid        NOT NULL REFERENCES sops
user_id         uuid        NOT NULL REFERENCES profiles
version         text        NOT NULL
acknowledged_at timestamptz DEFAULT now()
UNIQUE (sop_id, user_id, version)
```
> Only created for own-department SOPs. Cross-department read-only views do not generate acknowledgement rows.

### change_controls
```sql
id                    uuid        PK DEFAULT gen_random_uuid()
sop_id                uuid        NOT NULL REFERENCES sops
old_version           text        NOT NULL
new_version           text        NOT NULL
old_file_url          text        NOT NULL
new_file_url          text        NOT NULL
diff_json             jsonb
delta_summary         text
status                text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','complete','waived'))
required_signatories  jsonb       NOT NULL
                                  -- Snapshot taken at CC creation time.
                                  -- Format: [{ user_id, full_name, role, department, waived: false }]
                                  -- NEVER re-queried live. Always use this snapshot for completion checks.
deadline              date        NOT NULL   ← DEFAULT created_at::date + 14
issued_by             uuid        REFERENCES profiles
created_at            timestamptz DEFAULT now()
completed_at          timestamptz
```
> `required_signatories` is populated by `create_change_control()` at CC creation time by snapshotting all Managers in the SOP's primary department + the issuing QA Manager. It is never modified except by an Admin waiving a signatory (sets `waived: true` on that entry + writes audit log).

### signature_certificates
```sql
id                uuid        PK DEFAULT gen_random_uuid()
change_control_id uuid        NOT NULL REFERENCES change_controls
user_id           uuid        NOT NULL REFERENCES profiles
signature_url     text        NOT NULL
ip_address        text
signed_at         timestamptz DEFAULT now()
UNIQUE (change_control_id, user_id)
```
> No UPDATE or DELETE policy for any role. Immutable once inserted.

### equipment
```sql
id                    uuid        PK DEFAULT gen_random_uuid()
asset_id              text        NOT NULL UNIQUE
name                  text        NOT NULL
department            text        NOT NULL REFERENCES departments(name)
secondary_departments text[]      NOT NULL DEFAULT '{}'
serial_number         text
model                 text
photo_url             text
linked_sop_id         uuid        REFERENCES sops
frequency             text        CHECK (frequency IN ('daily','weekly','monthly','quarterly','custom'))
custom_interval_days  int
last_serviced         date
next_due              date
status                text        NOT NULL DEFAULT 'pending_qa'
                                  CHECK (status IN ('pending_qa','active','inactive'))
submitted_by          uuid        REFERENCES profiles
approved_by           uuid        REFERENCES profiles
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
```

### pm_tasks
```sql
id           uuid        PK DEFAULT gen_random_uuid()
equipment_id uuid        NOT NULL REFERENCES equipment
assigned_to  uuid        NOT NULL REFERENCES profiles   ← Required. Set at equipment approval.
due_date     date        NOT NULL
status       text        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending','complete','overdue'))
completed_by uuid        REFERENCES profiles
completed_at timestamptz
notes        text
photo_url    text
created_at   timestamptz DEFAULT now()
```
> `assigned_to` is NOT NULL. A task must always have an owner. Managers can reassign via the asset detail page.

### pulse_items
```sql
id               uuid        PK DEFAULT gen_random_uuid()
recipient_id     uuid        REFERENCES profiles   ← NULL for dept/everyone broadcasts
sender_id        uuid        REFERENCES profiles
type             text        NOT NULL
                 CHECK (type IN (
                   'notice',
                   'approval_request',
                   'approval_update',
                   'cc_signature',
                   'cc_deadline',           ← escalation: CC overdue for signatures
                   'pm_due',
                   'pm_overdue',
                   'sop_active',
                   'system',
                   'todo'
                 ))
title            text        NOT NULL
body             text
entity_type      text
entity_id        uuid
parent_id        uuid        REFERENCES pulse_items   ← thread replies, max depth 1
audience         text        NOT NULL DEFAULT 'self'
                 CHECK (audience IN ('self','department','everyone'))
target_department text       REFERENCES departments(name)  ← used when audience='department'
is_read          boolean     NOT NULL DEFAULT false
is_acknowledged  boolean     NOT NULL DEFAULT false
thread_depth     int         NOT NULL DEFAULT 0   ← 0 = top-level, 1 = reply. Max 1.
created_at       timestamptz DEFAULT now()
```

**Broadcast model for audience-wide notifications:**
- `audience = 'self'` or a specific user notice: `recipient_id = user_id`, `target_department = NULL`
- `audience = 'department'`: `recipient_id = NULL`, `target_department = dept_name`
- `audience = 'everyone'`: `recipient_id = NULL`, `target_department = NULL`

The client Realtime subscription and initial page-load query filter accordingly:
```typescript
// Filter on client: show items where:
// (recipient_id = current_user_id)
// OR (audience = 'department' AND target_department = user.department)
// OR (audience = 'everyone')
```

This means one DB row per broadcast — not one row per recipient. Fan-out explosions are eliminated.

> Thread depth is enforced at insert time. The server action that creates a reply must check `parent.thread_depth = 0`. If not, reject with a 400. The UI also hides the reply input on items where `thread_depth = 1`.

### events
```sql
id          uuid        PK DEFAULT gen_random_uuid()
title       text        NOT NULL
description text
start_date  date        NOT NULL
end_date    date
type        text        NOT NULL DEFAULT 'manual'
            CHECK (type IN ('manual','pm_auto'))
visibility  text        NOT NULL DEFAULT 'department'
            CHECK (visibility IN ('public','department'))
department  text        REFERENCES departments(name)
created_by  uuid        REFERENCES profiles
created_at  timestamptz DEFAULT now()
```

### audit_log
```sql
id          uuid        PK DEFAULT gen_random_uuid()
actor_id    uuid        REFERENCES profiles
action      text        NOT NULL
entity_type text        NOT NULL
entity_id   uuid
metadata    jsonb
created_at  timestamptz DEFAULT now()
```
> Append-only. No UPDATE or DELETE for any role. Written by server-side triggers and server actions via service role only.

> Every `is_admin` grant or revoke MUST write an audit_log entry with `action = 'admin_granted'` or `action = 'admin_revoked'`, `metadata = { actor, target_user_id, target_name }`. This is enforced in the server action — it is not optional.

---

## DATABASE FUNCTIONS REFERENCE

| Function | Returns | Purpose |
|----------|---------|---------|
| `handle_new_user()` | trigger | Fires on auth.users INSERT. Creates profiles row with `is_active = true`. |
| `is_qa_manager(user_id uuid)` | boolean | Checks `departments.is_qa = true AND role = 'manager'`. Never checks dept name string. |
| `is_admin(user_id uuid)` | boolean | Checks `is_admin = true AND is_active = true`. |
| `is_active_user(user_id uuid)` | boolean | Checks `is_active = true`. Used in middleware and RLS. |
| `calculate_next_due(last date, freq text, interval int)` | date | Computes next PM due date from last serviced + frequency. |
| `create_change_control(sop_id uuid, qa_user_id uuid)` | uuid | Creates CC row. Snapshots required_signatories at call time. Sets deadline = today + 14. Returns new CC id. |
| `approve_sop_request(request_id uuid, qa_user_id uuid)` | jsonb | Validates qa_user_id ≠ submitted_by (rejects self-approval). Atomic: approves request, activates SOP or calls create_change_control(), writes audit_log. |
| `approve_equipment(equipment_id uuid, qa_user_id uuid)` | void | Validates QA manager. Sets status = active, creates first pm_task (with assigned_to from equipment.initial_assignee), writes audit_log. |
| `complete_pm_task(task_id uuid, user_id uuid, notes text)` | void | Marks task complete, updates equipment.last_serviced, recalculates next_due, creates next pm_task row (same assigned_to). |
| `increment_sop_version(current_version text, major bool)` | text | Parses vMAJOR.MINOR, increments minor (or major if flag = true). Returns new version string. |
| `waive_cc_signature(cc_id uuid, target_user_id uuid, admin_id uuid)` | void | Sets waived=true on the signatory entry in required_signatories jsonb. Writes audit_log with admin_id, target_user_id, reason. Triggers completion check. |
| `check_cc_completion(cc_id uuid)` | void | Checks if all non-waived required_signatories have a signature_certificates row. If complete: sets CC status = complete, activates new SOP version, releases SOP lock, fans out sop_active pulse items. |
| `get_pm_compliance(dept text)` | numeric | Returns PM completion % for dept in current calendar month. |

---

## RLS POLICY REFERENCE

> Every table has RLS enabled. Default is deny-all. Only explicit policies grant access.
> All policies that read user identity join to `profiles` and check `is_active = true`. Inactive users are denied at the RLS layer even if their JWT is technically valid.

| Table | Operation | Who | Condition |
|-------|-----------|-----|-----------|
| profiles | SELECT | Self | `id = auth.uid() AND is_active = true` |
| profiles | SELECT | QA Manager | `is_qa_manager(auth.uid())` |
| profiles | SELECT | Admin | `is_admin(auth.uid())` |
| profiles | UPDATE | Self | `id = auth.uid() AND is_active = true` |
| profiles | UPDATE | Admin | `is_admin(auth.uid())` — for role/dept/is_admin changes |
| departments | SELECT | Anyone (active) | `is_active_user(auth.uid())` |
| departments | INSERT/UPDATE | Admin | `is_admin(auth.uid())` |
| departments | DELETE | Admin | `is_admin(auth.uid())` — server action checks usage before allowing |
| sops | SELECT | Employee/Manager | `status = 'active'` — no dept filter (query-layer scoping, see Two-Layer Visibility Rule) |
| sops | SELECT | Manager (draft/pending) | `department = own dept AND status IN ('draft','pending_qa','pending_cc')` |
| sops | SELECT | QA Manager | All rows, all statuses |
| sops | INSERT | Manager | `submitted_by = auth.uid()` |
| sops | UPDATE | Via server functions only | No direct UPDATE policy for any app role |
| sop_approval_requests | INSERT | Manager | `submitted_by = auth.uid()` |
| sop_approval_requests | SELECT | Submitter | `submitted_by = auth.uid()` |
| sop_approval_requests | SELECT | QA Manager | All rows |
| sop_approval_requests | UPDATE | Via server functions only | No direct UPDATE policy |
| sop_approval_comments | INSERT | Submitter + QA | `author_id = auth.uid()` |
| sop_approval_comments | SELECT | Submitter + QA | Via parent request |
| sop_acknowledgements | INSERT | Employee/Manager | `user_id = auth.uid()` — only for own-dept SOPs (enforced in server action) |
| sop_acknowledgements | SELECT | Self | `user_id = auth.uid()` |
| sop_acknowledgements | SELECT | Manager (own dept) | Dept match |
| change_controls | SELECT | Manager | SOP dept = own dept OR user in required_signatories |
| change_controls | SELECT | QA Manager | All rows |
| change_controls | UPDATE | Via server functions only | No direct UPDATE policy |
| signature_certificates | INSERT | Manager + QA | `user_id = auth.uid()` |
| signature_certificates | SELECT | Manager | Dept match |
| signature_certificates | SELECT | QA Manager | All rows |
| signature_certificates | UPDATE/DELETE | Nobody | No policy — immutable |
| equipment | SELECT | Employee | `status = 'active' AND (department = own dept OR own dept = ANY(secondary_departments))` |
| equipment | SELECT | Manager | `department = own dept OR own dept = ANY(secondary_departments)` |
| equipment | SELECT | QA Manager | All rows |
| equipment | INSERT | Manager | `submitted_by = auth.uid()` |
| equipment | UPDATE | Via server functions only | No direct UPDATE policy |
| pm_tasks | SELECT | Employee/Manager | Equipment dept = own dept OR own dept in equipment.secondary_departments |
| pm_tasks | SELECT | QA Manager | All rows |
| pm_tasks | UPDATE | Via server functions only | No direct UPDATE policy |
| pulse_items | SELECT | Anyone (active) | `recipient_id = auth.uid() OR (audience='department' AND target_department=own dept) OR audience='everyone'` |
| pulse_items | INSERT | Anyone (active) | `sender_id = auth.uid()`, `type NOT IN ('system','cc_deadline','pm_overdue')` (system types server-only), `thread_depth <= 1` |
| pulse_items | UPDATE | Recipient | Only `is_read`, `is_acknowledged` columns. Enforced by column-level security. |
| events | SELECT | Anyone (active) | `visibility = 'public' OR department = own dept` |
| events | INSERT | Anyone (active) | `created_by = auth.uid()` |
| events | UPDATE/DELETE | Creator | `created_by = auth.uid()` |
| audit_log | SELECT | QA Manager | All rows |
| audit_log | SELECT | Admin | All rows |
| audit_log | INSERT | Server only | Via service role. No app-level INSERT policy. |
| audit_log | UPDATE/DELETE | Nobody | No policy — append-only |

---

## COMPONENT SOURCING GUIDE

### Shadcn Blocks (install in Phase 0)
```bash
npx shadcn@latest add dashboard-01
npx shadcn@latest add login-02
npx shadcn@latest add signup-02
```

### Magic UI (install in Phase 0)
```bash
npx magicui add number-ticker        ← KPI count-up animation (Phase 9)
npx magicui add animated-list        ← Pulse item slide-in (Phase 3)
npx magicui add shimmer-button       ← High-emphasis CTAs only: Sign, Approve, Submit
npx magicui add border-beam          ← Pending CC card highlight (Phase 6)
```

### Sourcing Decision Order
1. Full-page layout / auth screen → Shadcn block
2. Needs animation → Magic UI
3. Complex interaction not in Shadcn → check 21st.dev first
4. Nothing fits → build from spec

### The Golden Rule of Sourcing
> Libraries provide the shell. The spec defines the result. Remap every token immediately after install. Never let a library's defaults override the design system.

---

## PHASES

---

### PHASE 0 — Project Bootstrap

**Goal:** The project scaffolding, environment, Supabase connection, Tailwind token system, and all library installs are done. `npm run dev` runs. `/dashboard` redirects to `/login`. Nothing else.

**Steps:**

1. Create Next.js 15 app:
```bash
npx create-next-app@latest sop-guard-pro \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*"
```

2. Install core dependencies:
```bash
npm install @supabase/ssr @supabase/supabase-js
npm install @tanstack/react-table @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install mammoth dompurify @types/dompurify
npm install diff-match-patch @types/diff-match-patch
npm install date-fns react-signature-canvas @types/react-signature-canvas
npm install clsx tailwind-merge lucide-react
```

3. Initialise Shadcn:
```bash
npx shadcn@latest init
npx shadcn@latest add button input label textarea select dialog \
  sheet dropdown-menu table badge tabs avatar toast card separator \
  skeleton scroll-area slider switch popover calendar
```

4. Install Shadcn blocks and Magic UI:
```bash
npx shadcn@latest add dashboard-01
npx shadcn@latest add login-02
npx shadcn@latest add signup-02
npx magicui add number-ticker animated-list shimmer-button border-beam
```

5. Configure `tailwind.config.ts`:
```typescript
extend: {
  colors: {
    brand: { navy: '#0D2B55', blue: '#1A5EA8', teal: '#00C2A8' }
  }
}
```

6. Create `/lib/utils/cn.ts`, `/lib/utils/dates.ts` (date-fns wrappers), `/lib/utils/permissions.ts` (client-safe helpers: `isOwnDept()`, `canSign()`), `/lib/utils/version.ts` (`incrementVersion(current: string, major: boolean): string`).

7. Create all three Supabase client files: `client.ts` (browser), `server.ts` (server with cookies), `middleware.ts` (session refresh).

8. Create root `middleware.ts`:
   - Calls `supabase.auth.getUser()`.
   - Unauthenticated → redirect to `/login`.
   - Authenticated but `is_active = false` → redirect to `/login` with `?reason=inactive` query param. The login page renders a specific message for this case.
   - Authenticated + `onboarding_complete = false` → redirect to `/onboarding`.
   - Authenticated + active + complete → allow through.

9. Create `.env.local` with all required variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```
Add `.env.local` to `.gitignore`. Commit `.env.local.example` with all keys, empty values, and a comment explaining each one.

10. Create `/types/app.types.ts` with TypeScript interfaces for: `Profile`, `Department`, `SopRecord`, `SopVersion`, `SopApprovalRequest`, `SopApprovalComment`, `SopAcknowledgement`, `ChangeControl`, `SignatureCertificate`, `Equipment`, `PmTask`, `PulseItem`, `CalendarEvent`, `AuditLog`. These must match the schema exactly. Include the `required_signatories` jsonb type as:
```typescript
interface CcSignatory {
  user_id:    string;
  full_name:  string;
  role:       'manager';
  department: string;
  waived:     boolean;
}
```

11. Build the complete directory structure. Every folder must exist from Phase 0.

**Phase 0 Checklist:**
- [ ] `npm run dev` runs with zero errors
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run lint` passes clean
- [ ] Supabase client connects (verify with a test query in a server component)
- [ ] `/dashboard` redirects to `/login` when unauthenticated
- [ ] Brand colour tokens available as Tailwind classes (`bg-brand-navy`, `text-brand-teal`, etc.)
- [ ] `.env.local` is NOT tracked by git
- [ ] `.env.local.example` IS tracked with all keys documented
- [ ] All directories from spec exist
- [ ] `incrementVersion('v1.0', false)` returns `'v1.1'`
- [ ] `incrementVersion('v1.9', true)` returns `'v2.0'`
- [ ] No `any` types

**Commit:** `phase-0: bootstrap, supabase clients, tailwind tokens, all library installs, type scaffolding`

---

### PHASE 1 — Database & Schema

**Goal:** The complete database schema is live in Supabase with RLS policies active on every table. Database functions exist and are tested. No UI — just a working, correct data layer.

**Steps:**

Create migration files in `/supabase/migrations/` in this exact order:

**`001_departments.sql`**
```sql
CREATE TABLE departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  colour     text NOT NULL DEFAULT 'blue',
  is_qa      boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
```

**`002_profiles.sql`**
```sql
CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name           text NOT NULL,
  department          text NOT NULL REFERENCES departments(name),
  role                text NOT NULL CHECK (role IN ('manager','employee')),
  is_admin            boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  employee_id         text,
  job_title           text NOT NULL DEFAULT '',
  phone               text,
  avatar_url          text,
  signature_url       text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  notification_prefs  jsonb DEFAULT '{"email": true, "pulse": true}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**`003_sops.sql`** — SOPs + approval tables + acknowledgements (see schema above for all columns including `locked` and `pending_cc` status).

**`004_change_controls.sql`** — `change_controls` (including `required_signatories jsonb NOT NULL`, `deadline date NOT NULL`) + `signature_certificates`.

**`005_equipment.sql`** — `equipment` (including `secondary_departments text[]`) + `pm_tasks` (`assigned_to uuid NOT NULL REFERENCES profiles`).

**`006_pulse_items.sql`** — `pulse_items` (including `thread_depth int NOT NULL DEFAULT 0`, `target_department text`, `recipient_id` nullable).

**`007_calendar.sql`** — `events`.

**`008_audit_log.sql`** — `audit_log`.

**`009_functions.sql`** — all functions in this order:

```sql
-- is_active_user: used in all RLS policies to block inactive users
CREATE OR REPLACE FUNCTION is_active_user(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND is_active = true);
$$;

-- is_qa_manager: NEVER checks department name string. Uses is_qa flag on departments table.
CREATE OR REPLACE FUNCTION is_qa_manager(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.name = p.department
    WHERE p.id = user_id AND p.role = 'manager' AND d.is_qa = true AND p.is_active = true
  );
$$;

-- is_admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND is_admin = true AND is_active = true);
$$;

-- increment_sop_version
CREATE OR REPLACE FUNCTION increment_sop_version(current_version text, bump_major boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  parts text[];
  major int;
  minor int;
BEGIN
  parts := string_to_array(replace(current_version, 'v', ''), '.');
  major := parts[1]::int;
  minor := parts[2]::int;
  IF bump_major THEN RETURN 'v' || (major + 1)::text || '.0';
  ELSE RETURN 'v' || major::text || '.' || (minor + 1)::text;
  END IF;
END;
$$;

-- calculate_next_due
CREATE OR REPLACE FUNCTION calculate_next_due(last_date date, freq text, custom_days int DEFAULT NULL)
RETURNS date LANGUAGE plpgsql AS $$
BEGIN
  RETURN CASE freq
    WHEN 'daily'     THEN last_date + INTERVAL '1 day'
    WHEN 'weekly'    THEN last_date + INTERVAL '7 days'
    WHEN 'monthly'   THEN last_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN last_date + INTERVAL '3 months'
    WHEN 'custom'    THEN last_date + (custom_days || ' days')::interval
    ELSE last_date + INTERVAL '1 month'
  END;
END;
$$;

-- create_change_control: snapshots signatories at creation time
CREATE OR REPLACE FUNCTION create_change_control(
  p_sop_id uuid, p_qa_user_id uuid, p_old_version text,
  p_new_version text, p_old_file_url text, p_new_file_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_cc_id uuid;
  signatories jsonb;
BEGIN
  -- Snapshot: all managers in SOP's primary department + the QA manager
  SELECT jsonb_agg(jsonb_build_object(
    'user_id',    p.id,
    'full_name',  p.full_name,
    'role',       p.role,
    'department', p.department,
    'waived',     false
  ))
  INTO signatories
  FROM profiles p
  JOIN sops s ON s.id = p_sop_id
  WHERE p.is_active = true
    AND p.role = 'manager'
    AND (p.department = s.department OR p.id = p_qa_user_id);

  INSERT INTO change_controls (
    sop_id, old_version, new_version, old_file_url, new_file_url,
    required_signatories, deadline, issued_by
  ) VALUES (
    p_sop_id, p_old_version, p_new_version, p_old_file_url, p_new_file_url,
    signatories, CURRENT_DATE + 14, p_qa_user_id
  ) RETURNING id INTO new_cc_id;

  -- Lock the SOP and set pending_cc status
  UPDATE sops SET status = 'pending_cc', locked = true WHERE id = p_sop_id;

  RETURN new_cc_id;
END;
$$;

-- approve_sop_request: blocks self-approval
CREATE OR REPLACE FUNCTION approve_sop_request(p_request_id uuid, p_qa_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req sop_approval_requests%ROWTYPE;
  new_version text;
  new_cc_id uuid;
BEGIN
  SELECT * INTO req FROM sop_approval_requests WHERE id = p_request_id;

  -- Block self-approval
  IF req.submitted_by = p_qa_user_id THEN
    RAISE EXCEPTION 'QA Manager cannot approve their own submission';
  END IF;

  -- Verify caller is QA manager
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve SOP requests';
  END IF;

  UPDATE sop_approval_requests SET status = 'approved', updated_at = now() WHERE id = p_request_id;

  IF req.type = 'new' THEN
    UPDATE sops SET status = 'active', approved_by = p_qa_user_id, updated_at = now()
    WHERE id = req.sop_id;
    -- Insert sop_versions row
    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    SELECT version, req.file_url, req.submitted_by FROM sops WHERE id = req.sop_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (p_qa_user_id, 'sop_approved_new', 'sop', req.sop_id);
    RETURN jsonb_build_object('result', 'activated');
  ELSE
    -- type = 'update': get current version, compute new version, create CC
    SELECT version INTO new_version FROM sops WHERE id = req.sop_id;
    new_version := increment_sop_version(new_version, false);
    -- Insert the new sop_versions row as draft
    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    VALUES (req.sop_id, new_version, req.file_url, req.submitted_by);
    -- Create the CC (snapshots signatories)
    new_cc_id := create_change_control(
      req.sop_id, p_qa_user_id,
      (SELECT version FROM sops WHERE id = req.sop_id), new_version,
      (SELECT file_url FROM sops WHERE id = req.sop_id), req.file_url
    );
    UPDATE sops SET version = new_version, updated_at = now() WHERE id = req.sop_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id,
      metadata) VALUES (p_qa_user_id, 'change_control_issued', 'change_control',
      new_cc_id, jsonb_build_object('sop_id', req.sop_id, 'new_version', new_version));
    RETURN jsonb_build_object('result', 'change_control_issued', 'change_control_id', new_cc_id);
  END IF;
END;
$$;

-- check_cc_completion
CREATE OR REPLACE FUNCTION check_cc_completion(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc change_controls%ROWTYPE;
  signatory jsonb;
  all_signed boolean := true;
  sig_exists boolean;
BEGIN
  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF cc.status = 'complete' THEN RETURN; END IF;

  FOR signatory IN SELECT * FROM jsonb_array_elements(cc.required_signatories) LOOP
    IF (signatory->>'waived')::boolean = false THEN
      SELECT EXISTS (
        SELECT 1 FROM signature_certificates
        WHERE change_control_id = p_cc_id AND user_id = (signatory->>'user_id')::uuid
      ) INTO sig_exists;
      IF NOT sig_exists THEN all_signed := false; EXIT; END IF;
    END IF;
  END LOOP;

  IF all_signed THEN
    UPDATE change_controls SET status = 'complete', completed_at = now() WHERE id = p_cc_id;
    -- Activate new version, supersede old
    UPDATE sops SET status = 'active', locked = false, date_revised = CURRENT_DATE,
      file_url = cc.new_file_url, updated_at = now() WHERE id = cc.sop_id;
    INSERT INTO sop_versions (sop_id, version, file_url)
    VALUES (cc.sop_id, cc.new_version, cc.new_file_url)
    ON CONFLICT DO NOTHING;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (NULL, 'change_control_completed', 'change_control', p_cc_id);
    -- Fan out sop_active pulse to all dept employees (broadcast row)
    INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
    SELECT NULL, 'sop_active',
      'SOP Updated: ' || s.title,
      'Version ' || cc.new_version || ' is now active.',
      'sop', cc.sop_id, 'department', s.department
    FROM sops s WHERE s.id = cc.sop_id;
  END IF;
END;
$$;

-- waive_cc_signature (Admin only — enforced in server action)
CREATE OR REPLACE FUNCTION waive_cc_signature(
  p_cc_id uuid, p_target_user_id uuid, p_admin_id uuid, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE change_controls
  SET required_signatories = (
    SELECT jsonb_agg(
      CASE WHEN (s->>'user_id') = p_target_user_id::text
        THEN s || '{"waived": true}'
        ELSE s END
    )
    FROM jsonb_array_elements(required_signatories) s
  )
  WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_admin_id, 'cc_signature_waived', 'change_control', p_cc_id,
    jsonb_build_object('waived_user_id', p_target_user_id, 'reason', p_reason));

  PERFORM check_cc_completion(p_cc_id);
END;
$$;

-- complete_pm_task
CREATE OR REPLACE FUNCTION complete_pm_task(p_task_id uuid, p_user_id uuid, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  task pm_tasks%ROWTYPE;
  eq   equipment%ROWTYPE;
  next_due_date date;
BEGIN
  SELECT * INTO task FROM pm_tasks WHERE id = p_task_id;
  SELECT * INTO eq FROM equipment WHERE id = task.equipment_id;

  UPDATE pm_tasks SET status = 'complete', completed_by = p_user_id,
    completed_at = now(), notes = p_notes WHERE id = p_task_id;

  next_due_date := calculate_next_due(CURRENT_DATE, eq.frequency, eq.custom_interval_days);

  UPDATE equipment SET last_serviced = CURRENT_DATE, next_due = next_due_date,
    updated_at = now() WHERE id = eq.id;

  -- Create next task (same assignee)
  INSERT INTO pm_tasks (equipment_id, assigned_to, due_date)
  VALUES (eq.id, task.assigned_to, next_due_date);

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_user_id, 'pm_task_completed', 'pm_task', p_task_id);
END;
$$;

-- get_pm_compliance
CREATE OR REPLACE FUNCTION get_pm_compliance(p_dept text)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN COUNT(*) = 0 THEN 100
    ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'complete') / COUNT(*), 1)
  END
  FROM pm_tasks t
  JOIN equipment e ON e.id = t.equipment_id
  WHERE e.department = p_dept
    AND date_trunc('month', t.due_date) = date_trunc('month', CURRENT_DATE);
$$;
```

**`010_triggers.sql`**
- `handle_new_user`: fires on `auth.users` INSERT. Creates profile with `is_active = true`, `onboarding_complete = false`. All other fields null until onboarding.
- `signature_inserted`: fires AFTER INSERT on `signature_certificates`. Calls `check_cc_completion(NEW.change_control_id)`.
- `updated_at`: fires BEFORE UPDATE on `profiles`, `sops`, `equipment`. Sets `updated_at = now()`.

**`011_rls.sql`** — all RLS policies from the RLS POLICY REFERENCE table above. Enable RLS on every table at the start of this file. Add `is_active_user(auth.uid())` to every policy that grants access to active users.

**`012_seed.sql`**
```sql
-- Seed QA department first (required before any users can sign up)
INSERT INTO departments (name, colour, is_qa) VALUES ('QA', 'blue', true);
-- Seed test departments
INSERT INTO departments (name, colour) VALUES
  ('Engineering', 'orange'),
  ('Logistics',   'green'),
  ('Maintenance', 'purple');
```

**`013_setup_guard.sql`** — creates a database function used by the `/setup` first-admin bootstrap route:
```sql
CREATE OR REPLACE FUNCTION has_any_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE is_admin = true AND is_active = true);
$$;
```

Push all migrations:
```bash
supabase db push
supabase gen types typescript --local > types/database.types.ts
```

**Phase 1 Checklist:**
- [ ] All 11 tables exist with correct columns and constraints
- [ ] RLS enabled on every table (green indicator in Supabase dashboard)
- [ ] `is_active` column exists on `profiles` with DEFAULT true
- [ ] `required_signatories` column on `change_controls` is `jsonb NOT NULL`
- [ ] `deadline` column on `change_controls` is `date NOT NULL`
- [ ] `locked` column on `sops` is `boolean NOT NULL DEFAULT false`
- [ ] `thread_depth` column on `pulse_items` is `int NOT NULL DEFAULT 0`
- [ ] `secondary_departments` exists on both `sops` AND `equipment`
- [ ] `assigned_to` on `pm_tasks` is NOT NULL with FK to profiles
- [ ] `file_url` and `version_label` on `sop_approval_requests` are NOT NULL
- [ ] `handle_new_user` trigger fires correctly (test: create auth user, profile appears)
- [ ] `signature_inserted` trigger fires `check_cc_completion` on certificate insert
- [ ] `is_qa_manager()` uses `departments.is_qa = true` — never string comparison
- [ ] `approve_sop_request()` raises exception when `submitted_by = qa_user_id`
- [ ] `increment_sop_version('v1.0', false)` returns `'v1.1'`
- [ ] `increment_sop_version('v1.9', true)` returns `'v2.0'`
- [ ] `create_change_control()` sets `deadline = today + 14` and populates `required_signatories`
- [ ] QA seed department has `is_qa = true`
- [ ] `has_any_admin()` returns false on a fresh database
- [ ] Generated TypeScript types match schema
- [ ] `npm run build` passes

**Commit:** `phase-1: full schema, all db functions with fixes, rls policies, seed data, setup guard`

---

### PHASE 2 — First-Admin Bootstrap, Authentication & Onboarding

**Goal:** The system has a safe path to the first Admin account. Auth works. The 4-step onboarding wizard completes correctly including signature capture. Session routing works for active and inactive users.

#### Part A — First-Admin Bootstrap (`/setup`)

This route exists so the client's system administrator can create the first Admin account without requiring a developer to manually set a database value.

**Access rule:** `/setup` is only accessible when `has_any_admin()` returns false. The moment one Admin exists, this route redirects to `/login` permanently. Enforce in both the page's server component AND in middleware.

**`/app/(auth)/setup/page.tsx`**:
- Calls `has_any_admin()` on the server. If true, redirect to `/login`.
- Simple form: Full Name, Email, Password (min 12 chars), Confirm Password.
- On submit (server action):
  1. Check `has_any_admin()` again server-side (double-check — not just UI).
  2. Create auth user via `supabase.auth.admin.createUser()`.
  3. Upsert profile: `department = QA` (first admin is always QA to start), `role = 'manager'`, `is_admin = true`, `is_active = true`, `onboarding_complete = false`.
  4. Write `audit_log`: `action = 'first_admin_created'`.
  5. Redirect to `/onboarding`.
- Style: same `login-02` block but with a banner: "Initial Setup — Create the first administrator account."

#### Part B — Login & Signup

**`/login/page.tsx`** (use `login-02` block):
- Wire right-panel form to `supabase.auth.signInWithPassword()`.
- Handle `?reason=inactive` query param: show a specific banner "Your account has been deactivated. Contact your administrator."
- On success: middleware handles routing (active users → dashboard, inactive → back to login with banner).
- Remap left panel to `bg-brand-navy`.

**`/signup/page.tsx`** (use `signup-02` block):
- Wire to `supabase.auth.signUp()` with `emailRedirectTo: /onboarding`.
- On success: show "Check your email to confirm your account."
- Users cannot sign up if the organisation already has users — this is a self-service signup for orgs using the platform. Existing users are added by an Admin in Settings.

#### Part C — Onboarding (4 Steps)

Use `signup-02` card as the step container. Build `<OnboardingLayout />` wrapping every step with a progress bar (4 segments, filled per step) and "Step X of 4" counter.

**Step 1 — Department & Role**
- Department: dropdown populated from `departments` table (all rows, any order). Required.
- Role: two large card toggles — Manager and Employee. Each has an icon, label, and one-sentence description. Required.
- When Manager is selected: inline note appears: "Managers can submit SOPs and are required to sign Change Controls."
- On "Continue": validate both fields selected. Upsert to `profiles.department` and `profiles.role`. Do NOT set `onboarding_complete = true` yet.

**Step 2 — Profile Details**
- Full Name (required), Job Title (required), Employee ID (optional), Phone (optional).
- Avatar upload (optional): click or drag to upload. Circular preview. Store at `avatars/[user_id]` in Supabase Storage. On upload, update `profiles.avatar_url` immediately.
- On "Continue": validate required fields. Upsert to profiles.

**Step 3 — Digital Signature**
- Two tabs: Draw and Upload.
- Draw tab: `<SignatureCanvas />` wrapping `react-signature-canvas`. Clear button. "Preview" area showing the drawn line in real-time.
- Upload tab: drag-and-drop PNG/JPG only. Max 2MB. Preview shown after selection.
- On "Confirm Signature": upload to `signatures/[user_id].png`. Update `profiles.signature_url`. 
- This step is required. "Continue" is disabled until `profiles.signature_url` is set.
- On "Continue": verify `signature_url` is set server-side before allowing through.

**Step 4 — Review & Confirm**
- Summary card: avatar, full name, department badge, role badge, job title, "Signature: Captured ✓" indicator.
- "Complete Setup" button (ShimmerButton):
  - Server action: sets `profiles.onboarding_complete = true`.
  - Writes `audit_log`: `action = 'onboarding_completed'`.
  - Redirects to `/dashboard`.

**Components to build:**
`<OnboardingLayout />`, `<DeptRoleStep />`, `<ProfileStep />`, `<SignatureStep />`, `<ReviewStep />`, `<AvatarUpload />`, `<SignatureCanvas />`, `<RoleToggleCard />`

**Middleware routing (complete this phase):**
```
No session                              → /login
Session + profile.is_active = false     → /login?reason=inactive
Session + onboarding_complete = false   → /onboarding
Session + route = /setup + has_admin    → /login
Session + active + complete             → allow through
```

**Phase 2 Checklist:**
- [ ] `/setup` route accessible on fresh DB (has_any_admin = false)
- [ ] `/setup` redirects to `/login` when any admin already exists
- [ ] `/setup` server action double-checks `has_any_admin()` before creating account
- [ ] First admin created via `/setup` has `is_admin = true`, `department = QA`
- [ ] `audit_log` entry written for first admin creation
- [ ] Login works, session persists across browser refresh
- [ ] Login with inactive account (`is_active = false`) shows deactivation message
- [ ] Logout clears session, redirects to `/login`
- [ ] Unauthenticated `/dashboard` access → `/login`
- [ ] Incomplete onboarding → `/onboarding`
- [ ] Onboarding Step 3: cannot proceed without confirmed signature
- [ ] Signature stored in Supabase Storage, `signature_url` updated in profile
- [ ] `onboarding_complete = true` set only after Step 4 confirm
- [ ] `audit_log` entry written on onboarding completion
- [ ] `npm run build` passes

**Commit:** `phase-2: setup route, auth, 4-step onboarding, signature capture, inactive user routing`

---

### PHASE 3 — Shell Layout & The Pulse

**Goal:** The authenticated shell renders on all dashboard routes. The Pulse has a live Supabase Realtime subscription using the broadcast model and renders items by type. Navigation works. Personal to-dos work. Notice composer works.

**Starting point:** Use the installed `dashboard-01` block. Read the generated files before adapting.

**`<TopNav />`** (adapt from dashboard-01 SiteHeader)
- Fixed, 48px height, `bg-brand-navy`, `z-50`
- Left: "SOP-Guard Pro" wordmark in white Inter bold
- Centre: `<GlobalSearch />` — wired up fully in Phase 4; build the shell here
- Right: `<PulseBell />` (unread count badge, visible at all breakpoints) + user avatar dropdown (Profile → `/settings`, Sign Out)

**`<Sidebar />`** (adapt from dashboard-01 AppSidebar)
- Fixed left, 240px wide, `bg-white`, `border-r border-slate-200`
- Top section: avatar, full name, department badge, role badge
- Nav items: Dashboard · SOP Library · Equipment · Calendar · Reports
- Bottom: Settings
- Active state: `bg-blue-50`, `border-l-[3px] border-brand-teal`, font-semibold text
- Collapses to 56px icon-only strip at 1024px (SidebarProvider handles this)
- **The sidebar never has department navigation items.** This is structural — not a conditional hide.

**`<ThePulse />`**
- Fixed right panel, 300px wide, `bg-slate-50`, `border-l border-slate-200`
- Header: "Pulse" heading + unread count badge + "Mark all read" button
- Item groups (UI-only, all from one query): Priority | Today | Messages | Personal
- Bottom: Personal to-do input (text field + Add button) + "Send Notice" ShimmerButton

**Supabase Realtime subscription (broadcast model):**
```typescript
// Fetch initial items on mount — last 50, filtered by visibility
const { data: initialItems } = await supabase
  .from('pulse_items')
  .select('*')
  .or(`recipient_id.eq.${user.id},and(audience.eq.everyone),and(audience.eq.department,target_department.eq.${user.department})`)
  .eq('is_read', false)
  .order('created_at', { ascending: false })
  .limit(50);

// Realtime subscription — same filter logic
const channel = supabase
  .channel('pulse')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'pulse_items',
  }, (payload) => {
    const item = payload.new as PulseItem;
    // Filter client-side: show if matches user
    const isForMe = item.recipient_id === user.id
      || item.audience === 'everyone'
      || (item.audience === 'department' && item.target_department === user.department);
    if (isForMe) prependItem(item); // AnimatedList handles animation
  })
  .subscribe();
```
> Note: client-side filtering after the Realtime event is intentional. The broadcast model means all authenticated users receive the channel event; the client decides relevance. This is correct and expected.

**`<PulseItem />`** — type → renderer map:
```typescript
const renderers: Record<PulseItemType, React.FC<PulseItemProps>> = {
  notice:            NoticeItem,       // shows reply input if thread_depth = 0
  approval_request:  ApprovalRequestItem,
  approval_update:   ApprovalUpdateItem,
  cc_signature:      CcSignatureItem,
  cc_deadline:       CcDeadlineItem,   // red, escalation styling
  pm_due:            PmDueItem,
  pm_overdue:        PmOverdueItem,
  sop_active:        SopActiveItem,
  system:            SystemItem,
  todo:              TodoItem,
};
```

**Notice thread depth enforcement in the UI:**
- `NoticeItem` renders a reply input only when `item.thread_depth === 0`.
- When a reply is submitted: server action checks `parent.thread_depth === 0` before inserting. Rejects with 400 if `thread_depth === 1`. Sets `thread_depth = 1` on the new item.
- Reply items render with no reply input, no reply button.

**`<NoticeComposer />`** — Sheet from Pulse bottom button:
- Audience: Individual (user search, active users only), My Department, Everyone
- Subject (required), Message (required, 500 char limit + counter)
- Send creates **one** `pulse_items` row with correct `audience`, `target_department`, `recipient_id` per the broadcast model.

**Phase 3 Checklist:**
- [ ] Shell renders correctly at 1280px, 1024px, 768px without layout shift
- [ ] Sidebar collapses to icon strip at 1024px
- [ ] Pulse hides at 768px — PulseBell badge remains visible in TopNav
- [ ] Active nav route highlighted correctly on all 5 routes
- [ ] Realtime subscription is active (verify in Network tab — WebSocket connection open)
- [ ] Inserting a broadcast `pulse_items` row (audience='everyone') in Supabase dashboard appears in Pulse for all open sessions without page refresh
- [ ] Inserting a dept-scoped row appears only for users in that department
- [ ] AnimatedList animation fires on new item arrival
- [ ] NoticeComposer sends one row for audience='department', one row for 'everyone', one row for 'self'
- [ ] Reply input only visible on `thread_depth = 0` items
- [ ] Reply to a reply is rejected with 400 (test via Supabase API directly)
- [ ] Personal to-do adds a `todo` type item visible immediately
- [ ] "Mark all read" marks all visible items as read
- [ ] `npm run build` passes

**Commit:** `phase-3: shell layout, topnav, sidebar, pulse panel with broadcast model, realtime subscription, notice composer, thread depth enforcement`

---

### PHASE 4 — SOP Library (Read Layer)

**Goal:** The SOP Library renders real data. The two-layer visibility rule is implemented correctly. The tab viewer, docx rendering, acknowledge flow, and version history all work. The SOP lock prevents concurrent edits.

**`/library/page.tsx`** — `<SopLibraryTable />` (TanStack Table v8)

Default view query (own dept):
```typescript
supabase.from('sops')
  .select('*, departments(colour)')
  .or(`department.eq.${user.department},secondary_departments.cs.{${user.department}}`)
  .in('status', user.role === 'employee' ? ['active'] : ['draft','pending_qa','pending_cc','active'])
  // QA: no department or status filter
```

Columns: SOP No. | Title | `<DeptBadge />` | Version | `<StatusBadge />` | Date Listed | Due for Revision | Locked indicator | Actions

`<StatusBadge status />`: `active` → green, `draft` → amber, `pending_qa` → blue, `pending_cc` → blue + lock icon, `superseded` → slate.

`<DeptBadge department />`: coloured pill using `departments.colour`. Reused throughout the entire app. Build in `/components/ui/dept-badge.tsx`.

**Submit Edit button guard — build this in the toolbar, not just the viewer:**
```typescript
// Disabled state on Submit Edit toolbar button:
const isLocked = sop.locked === true;
// Tooltip on hover when locked: "A Change Control is in progress for this SOP"
```

**`<GlobalSearch />`** (wired in this phase):
```typescript
// Cross-department search — active only, no dept filter
supabase.from('sops')
  .select('*, departments(colour)')
  .eq('status', 'active')
  .or(`title.ilike.%${query}%,sop_number.ilike.%${query}%`)
  .limit(20)
```
Results dropdown: SOP number | title | `<DeptBadge />` on every row. Clicking opens in the tab viewer.

**`<SopTabStrip />`** — Zustand store `useSopTabStore`. Tab: SOP number + truncated title + close button. Max 8 tabs open simultaneously — if 8 are already open, opening a 9th closes the oldest.

**`<SopViewer />`**:
- Fetch `.docx` via server-generated signed URL (60-min expiry, server-side only — never expose the Storage key to the client).
- Convert: `mammoth.convertToHtml({ arrayBuffer })`
- Sanitise: `DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p','h1','h2','h3','ul','ol','li','table','thead','tbody','tr','td','th','strong','em','br'], ALLOWED_ATTR: [] })`
- Render in a `prose max-w-none` div with Tailwind Typography.

Viewer header: SOP No. | Title | `<DeptBadge />` | version badge | `<StatusBadge />` | Last Revised | Approved By

**Cross-department viewer enforcement:**
```typescript
// Computed once on viewer load
const isOwnDept = sop.department === user.department
  || sop.secondary_departments.includes(user.department);

// Action bar
{isOwnDept && sop.status === 'active' && (
  <>
    {!hasAcknowledged && <AcknowledgeButton />}
    {user.role === 'manager' && !sop.locked && <SubmitEditButton />}
    {user.role === 'manager' && sop.locked && (
      <Badge variant="outline" className="border-amber-600 text-amber-600">
        Change Control in Progress — Editing locked
      </Badge>
    )}
  </>
)}
{!isOwnDept && (
  <Badge variant="outline" className="border-brand-teal text-brand-teal">
    From another department — read only
  </Badge>
)}
```

**`<AcknowledgeButton />`**: Check `sop_acknowledgements` for `(sop_id, user_id, version)`. On click: server action inserts row. Transition to confirmed (green checkmark + "Acknowledged"). Only own-dept Active SOPs. The server action checks `isOwnDept` before inserting — no acknowledgements for cross-dept reads.

**`<VersionHistorySheet />`**: All `sop_versions` for this SOP, newest first. Each row: version | date | uploaded by | "View" button. Viewing an old version shows it in the viewer with a full-width yellow banner: "SUPERSEDED — This is version [X]. The current version is [Y]."

**Phase 4 Checklist:**
- [ ] Default Library view: employees see only own-dept Active SOPs
- [ ] Default Library view: managers see draft/pending/active for own dept
- [ ] QA sees all SOPs, all depts, all statuses
- [ ] Secondary department SOPs appear in the Library for members of the secondary dept
- [ ] SOPs with `locked = true` show lock indicator in the table
- [ ] Submit Edit disabled (not just hidden) for locked SOPs, with tooltip
- [ ] Search: queries all active SOPs, no dept filter
- [ ] Search results: department badge on every row
- [ ] Cross-dept SOP opened via search: no action bar, teal "read only" badge
- [ ] Cross-dept SOP: Acknowledge action returns 400 if attempted server-side
- [ ] Own-dept Active SOP: Acknowledge button visible before acknowledging
- [ ] Acknowledge inserts row, button transitions to confirmed state, persists on refresh
- [ ] `.docx` renders as formatted HTML with headings, paragraphs, lists
- [ ] Script tags in a crafted docx do not execute (DOMPurify test)
- [ ] Up to 8 tabs open simultaneously; 9th tab closes the oldest
- [ ] Version history sheet opens, past versions render with SUPERSEDED banner
- [ ] `npm run build` passes

**Commit:** `phase-4: sop library, two-layer visibility, global search, tab viewer, docx rendering, lock indicator, acknowledge flow, version history`

---

### PHASE 5 — SOP Submission & QA Approval Flow

**Goal:** Any Manager can submit a new SOP or an update. QA is notified in real-time. The approval thread persists across resubmissions. `approve_sop_request()` enforces self-approval block. All actions write to audit log. Submitter is notified when their SOP goes live.

**`<SopUploadModal />`** (Shadcn Dialog, 3 steps)

Step 1 — File:
- Drag-and-drop zone, `.docx` only, max 25MB.
- Client-side validation: MIME type + file extension + size.
- Upload to `/api/storage/sop-upload` on "Next". Show spinner. Show filename + size preview on success.

Step 2 — Metadata:
- Type: radio — "New SOP" or "Update to Existing SOP".
- If "New": SOP Number (required, unique — validate against existing numbers), Title (required), Primary Department (auto-filled from user dept; QA can change it), Secondary Departments (multi-select of all departments except primary, optional).
- If "Update": search dropdown to find the existing SOP by number or title. Populates SOP Number and Title automatically. The update flow also shows the current version that will be updated.
- If the target SOP is `locked = true`: show error "A Change Control is currently in progress for this SOP. Updates cannot be submitted until it is complete." Block submission.

Step 3 — Notes to QA:
- Textarea, 500 chars max with counter. Optional for New SOPs, recommended for Updates.
- "Submit for QA Review" (ShimmerButton).
- On submit: server action creates `sop_approval_requests` row with `file_url`, `version_label = 'Submission 1'`.
- Calls `fan_out_pulse_item` equivalent: INSERT one `pulse_items` row with `audience = 'department'`, `target_department = QA dept name`, `type = 'approval_request'`.
- Write `audit_log`.
- Show success state: "Submitted for QA Review. You'll be notified when QA responds."

**`/api/storage/sop-upload` route:**
- Verify session — 401 if missing.
- Verify `profiles.is_active = true` — 403 if inactive.
- Validate MIME type server-side: reject anything that is not `application/vnd.openxmlformats-officedocument.wordprocessingml.document` with 415.
- Validate size: reject >25MB with 413.
- Store at `sop-uploads/[uuid].docx` — UUID filename only, never user-provided name.
- Return the file URL.

**`/approvals/page.tsx`** (QA Manager + Admin only):
- Middleware must redirect any non-QA non-admin user away from this route.
- Lists all `sop_approval_requests` grouped by SOP — newest submission per SOP shown by default, "View all submissions" expander to see resubmission history.
- Each card: requester avatar, name, dept badge, SOP number, title, type badge (New / Update), submission number ("Submission 2"), time-ago, "Review" button.
- Filter bar: Pending | Changes Requested | Approved | Rejected.

**`/approvals/[id]/page.tsx`** — QA Approval View:
- Left (65%): `<SopViewer />` rendering the specific submission's `file_url` (not the current live file).
- Right (35%): Submitter details, submission history (all previous rows for this SOP in chronological order), action section.
- **Self-approval guard in the UI:** if `request.submitted_by === current_user.id`, the Approve button is hidden and replaced with: "You submitted this SOP. Another QA Manager must approve it."
- Approve button (ShimmerButton, green): calls `approve_sop_request()` server action. Handles both outcomes (`activated` and `change_control_issued`). On `change_control_issued`: shows "Change Control created — Managers are being notified to sign."
- Request Changes button (amber): reveals comment textarea + Send. Creates `sop_approval_comments` row with `action = 'changes_requested'`. Sends `approval_update` pulse item to submitter.
- On approval (new SOP): submitter receives `type = 'sop_active'` pulse item.
- On approval (update / CC issued): submitter receives `type = 'approval_update'` pulse item with body "Your SOP update was approved. A Change Control has been issued for signing."
- On CC completion: submitter ALSO receives a final `type = 'sop_active'` pulse item when all signatures are collected and the new version goes live.

**Phase 5 Checklist:**
- [ ] Upload modal: wrong file type rejected client-side and server-side (415)
- [ ] Upload modal: file >25MB rejected client-side and server-side (413)
- [ ] Upload modal: locked SOP cannot be targeted for update
- [ ] New SOP creates `sop_approval_requests` row with `file_url` and `version_label = 'Submission 1'`
- [ ] QA Manager receives pulse item in real-time on submission (test with two browser sessions)
- [ ] `/approvals` inaccessible to non-QA non-admin users (server redirect, not just UI hide)
- [ ] Approval view renders the submitted file (not the current live file)
- [ ] QA self-approval blocked in UI and server function (test: QA submits, then tries to approve own submission — should fail)
- [ ] QA requests changes: comment appears in thread, submitter receives pulse item
- [ ] Submitter can resubmit: new row created with `version_label = 'Resubmission 2'`, thread continues
- [ ] QA approves new SOP: `sops.status = 'active'`, appears in Library for dept employees
- [ ] Submitter receives `sop_active` pulse when new SOP is approved
- [ ] QA approves update: CC created, SOP `status = 'pending_cc'`, `locked = true`
- [ ] Submitter receives `approval_update` pulse when update is approved and CC issued
- [ ] All actions appear in `audit_log` with correct actor, action, entity
- [ ] `npm run build` passes

**Commit:** `phase-5: sop upload modal, qa approval queue, approval view, thread, self-approval block, submitter notifications`

---

### PHASE 6 — Change Control Center

**Goal:** A Change Control shows a diff viewer, Gemini delta summary, and a correct signature grid built from the `required_signatories` snapshot. Signing works. Admins can waive a signature with an audit record. The CC deadline is displayed. Completion fires the DB trigger. Submitter is notified when the new version goes live.

**`/change-control/[id]/page.tsx`**

**`<ChangeControlHeader />`**:
- CC reference (formatted `CC-[YYYY]-[sequential]`) | SOP title | Issued date
- Status badge: "Pending Signatures" (red) | "Complete" (green)
- Deadline display: "Signatures due by [date]" — red if `deadline < today`, amber if within 3 days
- Progress: "X of Y signatures collected" (counts non-waived required_signatories against signature_certificates)
- BorderBeam on the entire card when `status = 'pending'`

**`<DiffViewer />`**:
- Two-column layout: Old version (left, `bg-red-50`, red left-border) | New version (right, `bg-green-50`, green left-border)
- Changed paragraphs shown in the relevant column with appropriate styling
- "Show All" / "Changes Only" toggle button
- Uses `change_controls.diff_json` — never recompute on the client
- If `diff_json = null`: show skeleton and trigger server action to compute:
  ```typescript
  // Server action: computeDiff(cc_id)
  // 1. Fetch old_file_url and new_file_url signed URLs
  // 2. Download both .docx files server-side
  // 3. mammoth.extractRawText() on both
  // 4. diff-match-patch to produce diff array
  // 5. Store as JSON in change_controls.diff_json
  ```

**`<DeltaSummaryCard />`**:
- Shows `change_controls.delta_summary` as bullet points.
- "AI Summary of Changes" header with Lucide Sparkles icon.
- Regenerate button (Lucide RefreshCw).
- Disclaimer always visible (never collapsible): "AI-generated summary. Verify against the full diff before signing."
- `/api/gemini/delta-summary` route: verify session → fetch diff_json → build prompt → call Gemini Flash → store result in `change_controls.delta_summary` → return.

**`<SignatureGrid />`**:
- Built from `change_controls.required_signatories` snapshot — **never re-queried live**.
- Each row: avatar initials | full name | role badge | dept badge | status.
- Status: Signed (green ✓ + timestamp) | Pending (clock icon) | Waived (grey, "Waived by Admin").
- Sign button: only rendered for `auth.uid() === row.user_id AND row.waived === false AND no existing certificate`.
- Waive button: only rendered for Admins, for rows where `waived = false`. Opens `<WaiveModal />`.

**`<SignatureConfirmModal />`**:
- Shows "You are signing [SOP title] [new_version] — [CC ref]"
- Displays user's stored signature image (fetched from server via signed URL — never from client state).
- "Confirm & Sign" ShimmerButton: server action `signChangeControl(cc_id)`.
  - Validate session and active status.
  - Capture IP from `request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')`.
  - Insert `signature_certificates` row.
  - Write `audit_log`.
  - The DB trigger `signature_inserted` fires `check_cc_completion()` automatically.
- On success: grid row transitions to green Signed state.

**`<WaiveModal />`** (Admin only):
- "You are waiving the signature requirement for [name] on [CC ref]."
- Reason textarea (required).
- "Confirm Waive" button: calls server action `waiveSignature(cc_id, target_user_id, reason)`.
  - Server action validates `is_admin(auth.uid())`.
  - Calls `waive_cc_signature()` DB function (writes audit_log, triggers completion check).
- Waived rows show "Waived by Admin" badge and are visually dimmed in the grid.

**CC Deadline Escalation (cron — wire in this phase):**
Add a daily check to `/api/cron/pm-alerts` (or a new `/api/cron/cc-deadline-check`):
```typescript
// Find CCs where deadline < today AND status = 'pending'
// For each: INSERT pulse_items row: audience='everyone' (or 'department'), type='cc_deadline'
//   title: "Change Control Overdue for Signatures"
//   body: "[SOP title] CC is past its signature deadline. Admin action may be required."
//   entity_type: 'change_control', entity_id: cc.id
// Update audit_log
```

**Phase 6 Checklist:**
- [ ] CC page loads from the deep link created in Phase 5
- [ ] BorderBeam visible on pending CC
- [ ] Deadline displayed correctly — red styling when past deadline
- [ ] Diff viewer renders with correct red/green column layout
- [ ] "Changes Only" toggle hides unchanged sections
- [ ] Gemini delta summary generates and displays as bullet points
- [ ] AI disclaimer always visible and not collapsible
- [ ] Signature grid built from `required_signatories` snapshot — not a live user query
- [ ] Sign button only visible to correct user if they have not signed and are not waived
- [ ] Signature confirmation modal shows correct stored signature image (verify it is not a placeholder)
- [ ] IP address stored in `signature_certificates.ip_address` (check in Supabase dashboard)
- [ ] Duplicate sign attempt rejected by unique constraint
- [ ] Waive button visible to Admin only
- [ ] Waive modal requires a reason
- [ ] Waiving a signature writes audit_log entry with actor, target, reason
- [ ] Waived row shows "Waived by Admin" badge
- [ ] After all non-waived signatories complete: CC status = complete, SOP = active, locked = false
- [ ] Dept employees receive `sop_active` broadcast pulse item on CC completion
- [ ] Original SOP submitter receives `sop_active` pulse item on CC completion
- [ ] CC past deadline triggers `cc_deadline` pulse item for Admins
- [ ] `npm run build` passes

**Commit:** `phase-6: change control, diff viewer, gemini summary, signature grid from snapshot, waive flow, deadline escalation`

---

### PHASE 7 — Equipment Registry & PM Planner

**Goal:** The Equipment Registry works with the same two-hub philosophy as the Library, including secondary department support. QA approval flow is correct. PM tasks always have an assignee. Reassignment works. Cron alerts fire.

**`/equipment/page.tsx`** — `<EquipmentTable />` (TanStack Table v8)

Columns: Asset ID | Name | `<DeptBadge />` | `<StatusBadge />` | Frequency | Last Serviced | Next Due | Actions

Default query — own dept + secondary depts:
```typescript
supabase.from('equipment')
  .select('*')
  .or(`department.eq.${user.department},secondary_departments.cs.{${user.department}}`)
  .in('status', user.role === 'employee' ? ['active'] : ['pending_qa','active','inactive'])
```

Next Due column: `next_due < today` → red bold + "OVERDUE" badge. `next_due <= today + 7` → amber text.

**`<AddEquipmentModal />`** (3-step Dialog)

Step 1 — Basic Info: Asset ID (required, unique — validate), Name (required), Primary Department (auto-filled, QA can change), Secondary Departments (multi-select, optional), Serial Number (optional), Model (optional), Photo (optional, upload to `equipment-photos/[uuid]`).

Step 2 — Maintenance: Frequency selector (Daily/Weekly/Monthly/Quarterly/Custom). If Custom: integer input "Every X days". Last Serviced date picker (required — must have a start date to compute first next_due). Link to SOP: search existing active SOPs (optional). **Initial Assignee: required — dropdown of active employees and managers in the primary department.** This becomes `assigned_to` on the first pm_task.

Step 3 — Review + Submit: summary card, "Submit for QA Review" ShimmerButton. Creates `equipment` row with `status = 'pending_qa'`, stores `initial_assignee_id` as a column (needed by `approve_equipment()` to create the first pm_task). Sends broadcast pulse item (audience='department', target_department = QA dept) with `type = 'approval_request'`, `entity_type = 'equipment'`.

**Equipment schema addition — `initial_assignee_id`:**
> Add this column to the `equipment` table in the migration. It is only needed until the first pm_task is created (on QA approval). After that, reassignment is managed through `pm_tasks.assigned_to`.
```sql
initial_assignee_id uuid REFERENCES profiles
```

**`/equipment/[id]/page.tsx`** — Asset Detail:

Left column: Asset ID badge, Name, dept/secondary dept badges, Status badge, Serial, Model, Frequency, Linked SOP (clickable → opens in Library tab viewer), Photo. QR code SVG (encode `${APP_URL}/equipment/${id}` — generate client-side).

Right column: "Next Service" card with urgency colouring. "Log PM Completion" button (active equipment only, own dept or secondary dept users). Service history table.

QA approval section (visible only to QA Manager if `status = 'pending_qa'`): Approve button (ShimmerButton, green) + Reject button. Approve calls `approve_equipment(equipment_id, qa_user_id)` server action. This DB function creates the first `pm_tasks` row with `assigned_to = equipment.initial_assignee_id`, `due_date = calculate_next_due(equipment.last_serviced, ...)`.

**`<PmCompletionModal />`**:
- Notes (required), Photo (optional, upload to `pm-photos/[task_id]`).
- Submit calls `complete_pm_task()` server action.
- On success: service history row appears, Next Due updates.

**Reassign Task** (Manager only, own dept):
- Kebab menu on each service history / upcoming task row: "Reassign"
- Opens a simple modal: dropdown of active employees/managers in the primary dept.
- Server action: `UPDATE pm_tasks SET assigned_to = new_user_id WHERE id = task_id`. Write audit_log.

**`/api/cron/pm-alerts`** route:
```typescript
// Verify: Authorization: Bearer ${CRON_SECRET} — reject 401 if missing/wrong
// pm_due: tasks where status='pending' AND due_date = today + 7 days
//   → INSERT pulse_items: recipient_id = task.assigned_to, type='pm_due'
// pm_overdue: tasks where status='pending' AND due_date < today
//   → UPDATE pm_tasks SET status='overdue'
//   → INSERT pulse_items: recipient_id=task.assigned_to + broadcast to dept managers, type='pm_overdue'
//   → INSERT audit_log
```

**`/api/cron/overdue-check`** route:
```typescript
// Verify cron secret
// Mark tasks overdue, write audit_log entries
// Check change_controls for deadline breaches, write cc_deadline pulse items
```

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/pm-alerts",      "schedule": "0 7 * * *" },
    { "path": "/api/cron/overdue-check",  "schedule": "0 6 * * *" }
  ]
}
```

**Phase 7 Checklist:**
- [ ] Equipment table shows own-dept + secondary-dept assets by default
- [ ] QA sees all equipment across all departments
- [ ] Add equipment modal: initial assignee field is required (cannot submit without selecting)
- [ ] Submitting equipment creates `pending_qa` row with `initial_assignee_id` set
- [ ] QA receives pulse item on submission
- [ ] QA approves: `status = 'active'`, first `pm_tasks` row created with `assigned_to = initial_assignee_id`, NOT NULL
- [ ] Asset detail page: QR code renders and encodes correct URL
- [ ] PM completion modal submits, service history row appears
- [ ] After completion: `last_serviced`, `next_due` updated, next pm_task created with same `assigned_to`
- [ ] Manager can reassign a task — `assigned_to` updates, audit_log entry written
- [ ] Reassignment audit_log entry shows old assignee and new assignee in metadata
- [ ] Equipment in secondary dept visible to secondary dept users
- [ ] Cron routes reject 401 without correct secret
- [ ] `npm run build` passes

**Commit:** `phase-7: equipment registry, secondary depts, required assignee, asset detail, pm completion, reassignment, cron routes`

---

### PHASE 8 — Company Calendar

**Goal:** Monthly grid renders. PM due dates auto-populate from equipment records. Manual events (public and dept-scoped) work. Upcoming panel shows next 14 days.

**`/calendar/page.tsx`** — build the grid with `date-fns`. Do not use `react-calendar` or `react-big-calendar`.

**Components:**
- `<CalendarGrid />` — monthly grid, today cell highlighted (`bg-brand-teal/10 font-bold`), prev/next month arrows, "Today" button
- `<CalendarCell />` — renders event chips for a given day, max 3 visible + "N more" overflow
- `<CalendarChip />` — `pm_auto` → teal, `manual` public → brand-blue, `manual` dept → slate
- `<NewEventModal />` — Title (required), Description (optional), Start Date (required), End Date (optional, must be ≥ Start), Visibility radio (Public / My Department Only). Submit inserts `events` row with `created_by = auth.uid()`.
- `<EventDetailPopover />` — chip click: title, description, date range, creator name, Delete button (own events only). Delete calls server action `deleteEvent(id)` — validates `created_by = auth.uid()`.
- `<UpcomingPanel />` — right sidebar listing next 14 days of events + PM due dates chronologically.

PM auto-events: query `equipment WHERE department = own dept (+ secondary depts) AND status = 'active' AND next_due BETWEEN today AND today + 60`. Rendered as teal chips. Not stored as `events` rows — read directly from the `equipment` table on calendar load.

**Phase 8 Checklist:**
- [ ] Calendar renders current month correctly with all days
- [ ] PM due dates appear as teal chips from equipment records
- [ ] Public events visible to all active users
- [ ] Dept-only events not visible to other departments (test with two accounts)
- [ ] Events from secondary-dept equipment appear for secondary dept users
- [ ] New event modal: end date before start date is rejected
- [ ] Created events appear immediately without page refresh
- [ ] "N more" overflow works for days with many events
- [ ] Delete button only visible on creator's own events
- [ ] Upcoming panel lists events in correct chronological order
- [ ] `npm run build` passes

**Commit:** `phase-8: company calendar, pm auto-events, manual events, dept visibility, upcoming panel`

---

### PHASE 9 — Dashboard & KPIs

**Goal:** Dashboard shows real, role-scoped data. KPI cards animate with NumberTicker. Activity feed is live via Realtime. Data scoping is correct for all permission tiers.

**`/dashboard/page.tsx`** — `<SectionCards />` from dashboard-01 as structural base.

KPI Cards (4):

| Card | Data Source | Colour Logic |
|------|-------------|-------------|
| Active SOPs | `COUNT sops WHERE status='active' AND (dept=own OR own IN secondary_departments)` | Blue (neutral) |
| Pending Approvals | `COUNT sop_approval_requests WHERE status='pending'` (QA: all; others: submitted_by=self) | Red if >0, green if 0 |
| PM Compliance | `get_pm_compliance(user.department)` | <70% red · 70–89% amber · ≥90% green |
| SOPs Due for Revision | `COUNT sops WHERE due_for_revision <= today+30 AND dept=own` | Amber if >0, green if 0 |

NumberTicker:
```tsx
<NumberTicker value={kpiValue} duration={0.6} className="text-3xl font-bold text-slate-800" />
```
KPI cards are clickable — navigate to the relevant filtered page.

**Activity Feed** — last 10 `audit_log` entries scoped to user's visibility:
- Employee/Manager: own dept entries only (`metadata->>'department' = own dept`)
- QA/Admin: all entries
- Each entry: avatar initials, actor name, action verb, entity name, time-ago timestamp
- Supabase Realtime subscription on `audit_log` — new entries prepend with AnimatedList animation

**Upcoming PM** — next 5 `pm_tasks` where `assigned_to = auth.uid()` OR `equipment.department = own dept` (for Managers), ordered by `due_date ASC`. Urgency: overdue → red, ≤7 days → amber, OK → green.

**Data scoping rules:**
- Employee: sees own-dept KPIs. Pending Approvals shows their own submissions only.
- Manager: same dept scope, Pending Approvals shows own submissions.
- QA Manager: all-dept KPIs. Pending Approvals shows all pending requests.
- Admin: same as their dept + role, plus the user count metric.

**Phase 9 Checklist:**
- [ ] All 4 KPI cards show correct real numbers
- [ ] NumberTicker animates 0 → actual value in 600ms on page load
- [ ] KPI colour logic correct for all urgency states
- [ ] Clicking each KPI card navigates to correct filtered view
- [ ] Activity feed shows real audit_log data with correct scope
- [ ] Activity feed prepends new entries in real-time (test by performing an action in another tab)
- [ ] Upcoming PM shows correct tasks with correct urgency colours
- [ ] QA/Admin see cross-department KPIs
- [ ] Employee/Manager scoped to own department only
- [ ] `npm run build` passes

**Commit:** `phase-9: dashboard, kpi cards, numberticker, scoped activity feed, upcoming pm`

---

### PHASE 10 — Reports & Audit Log

**Goal:** All five report types render with real, access-scoped data. CSV export works. AI Risk Insights generates. Date range filtering works on all reports.

**`/reports/page.tsx`** — two-panel layout: left report selector, right report content.

**Report 1 — SOP Change History**
Source: `audit_log` filtered to SOP + Change Control events.
Columns: SOP No. | Action | Actor Name | Dept | Timestamp | Version
Access: QA (all depts), Manager (own dept).

**Report 2 — Worker Acknowledgement Log**
Source: `sop_acknowledgements JOIN profiles JOIN sops`.
Columns: SOP No. | SOP Title | Employee Name | Dept | Version | Acknowledged At
Access: QA (all), Manager (own dept).

**Report 3 — PM Completion Log**
Source: `pm_tasks WHERE status='complete' JOIN equipment JOIN profiles(completed_by) JOIN profiles(assigned_to)`.
Columns: Asset ID | Asset Name | Dept | Assigned To | Completed By | Completion Date | Notes
Access: QA (all), Manager (own dept).

**Report 4 — Pulse / Notice Log**
Source: `pulse_items WHERE type='notice'`.
Columns: Sender | Audience | Target Dept | Subject | Body (truncated 100 chars) | Sent At
Access: **Admin only.** Server action returns 403 for non-admins.

**Report 5 — AI Risk Insights**
- Trigger: "Generate Insights" button. POST to `/api/gemini/risk-insights`.
- Route: verify session + `is_qa_manager() OR is_admin()`. Fetch last 30 days of audit_log for user's scope. Build prompt. Call Gemini Flash. Return structured JSON: `{ risk_level: 'low'|'medium'|'high', insights: string[] }`.
- Render: risk level badge (green/amber/red), bullet point list, "Generated at [timestamp]" footer.
- Cached: React Query `staleTime: 5 * 60 * 1000`. "Regenerate" button bypasses cache.
- Disclaimer: "AI-generated assessment. Use as a supplementary review tool only."
- Access: QA Manager + Admin only.

**CSV Export (all reports):**
Client-side CSV builder — no library needed:
```typescript
function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
}
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
// Trigger download
```

**Date range filter:** all reports support from/to date range via Shadcn date pickers. State managed in Zustand `useReportStore`.

**Phase 10 Checklist:**
- [ ] Report 1: shows correct SOP change events, scoped correctly
- [ ] Report 2: acknowledgement log shows correct data
- [ ] Report 3: PM log shows assigned_to and completed_by separately
- [ ] Report 4: returns 403 for non-admin users (test with Manager account)
- [ ] Report 5: returns 403 for non-QA non-admin users
- [ ] Report 5: generates risk insights, risk level badge renders in correct colour
- [ ] Date range filter narrows results correctly on all reports
- [ ] CSV export downloads a properly formatted, escaped file
- [ ] All reports show empty state when no data matches the filter
- [ ] `npm run build` passes

**Commit:** `phase-10: all report types, access guards, csv export, ai risk insights`

---

### PHASE 11 — Settings & Admin

**Goal:** Profile editing, signature redraw, notification prefs work for all users. Admin can manage users (including deactivation with soft-delete) and departments (with deletion guard). Admin `is_admin` changes write audit log entries and require password re-entry.

**`/settings/page.tsx`** — tabbed layout. Tabs visible to user are determined server-side.

**Tab 1 — Profile** (all users):
- Edit: Full Name, Job Title, Employee ID, Phone. All save via server action.
- Avatar upload (`<AvatarUpload />`).
- Re-draw Signature: shows current signature image preview. "Re-draw" button opens `<SignatureCanvas />` in a Dialog. On confirm: upload new image, update `profiles.signature_url`. Write audit_log: `action = 'signature_updated'`.

**Tab 2 — Notifications** (all users):
- Toggles: Email notifications, Pulse in-app notifications.
- Saved to `profiles.notification_prefs jsonb`.

**Tab 3 — Departments** (Admin only):
- Table: Name | Colour | Is QA | Created At | Actions.
- "Add Department" modal: Name (required, must be unique), Colour (preset 8 colour swatches).
- Edit colour inline (popover colour picker).
- Delete: server action checks `COUNT(profiles WHERE department = name) + COUNT(sops WHERE department = name OR name = ANY(secondary_departments))`. If either count > 0: reject with message "This department has [N] users and [M] SOPs. Reassign them before deleting." QA department (`is_qa = true`) cannot be deleted under any circumstance.

**Tab 4 — Users** (Admin only):
Table: Avatar | Name | Email | Department | Role | Is Admin | Status | Joined | Actions

Actions per user row (not available on own row):
- Change Role: dropdown (manager/employee). Server action. Write audit_log.
- Change Department: dropdown of all departments. Server action. Write audit_log.
- Grant/Revoke Admin:
  - **Requires password re-entry.** When Admin clicks Grant or Revoke, a `<PasswordConfirmModal />` appears. Admin enters their current password. Client sends it to a server action that calls `supabase.auth.signInWithPassword({ email: admin.email, password })` to verify. Only on success does the `is_admin` change proceed.
  - Server action writes `audit_log`: `action = 'admin_granted'` or `action = 'admin_revoked'`, `metadata = { actor_id, target_user_id, target_name }`.
  - Admin cannot grant/revoke their own admin flag. The button is hidden for the admin's own row.
- Deactivate / Reactivate:
  - Deactivate: sets `profiles.is_active = false`. Calls `supabase.auth.admin.signOut(user_id)` to invalidate their current session immediately. Write audit_log: `action = 'user_deactivated'`.
  - Reactivate: sets `profiles.is_active = true`. Write audit_log: `action = 'user_reactivated'`.
  - Neither hard-deletes the profile row. All historical data preserved.
  - Deactivated users shown in a separate "Inactive Users" collapsible section in the table, not mixed with active users.

**Phase 11 Checklist:**
- [ ] Profile edits save and persist on refresh
- [ ] Avatar change updates in TopNav and Settings without full page reload
- [ ] Signature redraw saves new image, audit_log entry written
- [ ] Notification prefs save correctly
- [ ] Department/User tabs hidden from non-admin users at the server level (not just CSS)
- [ ] Add Department: new dept immediately available in onboarding dropdown
- [ ] Department deletion: rejected if dept has users or SOPs, with specific counts in error message
- [ ] QA department deletion: always rejected
- [ ] Change Role: writes audit_log
- [ ] Grant Admin: requires password re-entry via `<PasswordConfirmModal />`
- [ ] Grant/Revoke Admin: writes audit_log with actor, target, and action
- [ ] Admin cannot see grant/revoke button on their own row
- [ ] Deactivate: `is_active = false`, user session invalidated immediately, user cannot log in
- [ ] Deactivated user middleware rejection: redirects to `/login?reason=inactive` with correct message
- [ ] Reactivate: `is_active = true`, user can log in again
- [ ] Inactive users shown in separate section, not mixed with active users
- [ ] All historical data (audit_log, signatures, acknowledgements) preserved after deactivation
- [ ] `npm run build` passes

**Commit:** `phase-11: settings, profile, signature redraw, admin user management with soft-delete, dept management with deletion guard, admin grant requires password`

---

### PHASE 12 — Polish, Performance & Launch

**Goal:** The app is production-ready. Every page has correct loading, empty, and error states. Performance is acceptable. Security headers are in place. The app deploys cleanly to Vercel with zero console errors.

**Loading States:**
- Every data-fetching component has a skeleton loader: `animate-pulse bg-slate-200 rounded`.
- Page-level `loading.tsx` files with skeleton layouts for every dashboard route.
- Suspense boundaries wrapping all async server components.

**Empty States (all required):**
- SOP Library (no SOPs in dept): icon + "No SOPs in your department yet" + "Upload the first SOP" button (Managers only)
- Equipment Registry (no equipment): icon + "No equipment registered" + "Add Equipment" button (Managers only)
- Pulse (all caught up): checkmark icon + "You're all caught up"
- Reports (no data for filter): calendar icon + "No data for this date range" + "Clear filter" link
- Approvals (no pending): checkmark + "No pending submissions"
- Change Control signature grid (no signatories — edge case): "No signatories required" (should never happen with correct data, but guard it)

**Error States:**
- All page-level server components wrapped in `error.tsx` boundaries with a retry button.
- All Supabase errors surfaced as inline `<ErrorCard />` components — not toast-only.
- Auth errors (session expired mid-session) → auto-redirect to `/login` with `?reason=session_expired`.
- `error.tsx` never exposes raw Supabase error messages to the user — log to console, show generic "Something went wrong" with a support reference code.

**Performance:**
- All images via `next/image` with explicit `width` and `height`.
- `<DiffViewer />` and `<SopViewer />` lazy-loaded: `dynamic(() => import(...), { ssr: false })`.
- Gemini API responses cached: React Query `staleTime: 5 * 60 * 1000`.
- Server component queries use `cache: 'no-store'` for real-time data (KPIs, Pulse initial load).

**Security headers** in `next.config.ts`:
```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy',   value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *.supabase.co; connect-src 'self' *.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com" },
];
```

**Accessibility baseline:**
- All icon-only buttons have `aria-label`.
- All modals: `role="dialog"`, trap focus, close on Escape.
- All form inputs have associated `<label>` via `htmlFor`.
- Focus rings visible everywhere: `focus-visible:ring-2 focus-visible:ring-brand-teal`.
- `StatusBadge` and `DeptBadge` include `aria-label` for screen readers.

**Vercel deployment:**
- Set all 6 environment variables in Vercel dashboard (Production + Preview environments).
- Set Supabase allowed redirect URLs: production domain only, no wildcards.
- Confirm Vercel Cron configured, `CRON_SECRET` matches the environment variable.
- Run `npm run build` clean before deploy.

> **CRON_SECRET rotation note:** Rotating `CRON_SECRET` requires updating the Vercel environment variable AND redeploying simultaneously. There is a brief window between updating the env var and the new deploy completing where cron jobs will fail with 401. Schedule rotation during a low-traffic period. Update `CRON_SECRET` in Vercel, trigger an immediate redeploy, verify cron routes respond correctly within 5 minutes.

**Final launch checklist:**
- [ ] Every page has a skeleton loader (loading.tsx)
- [ ] Every data list has a designed empty state
- [ ] Every server component has an error.tsx boundary
- [ ] Network error mid-session shows inline ErrorCard (not blank screen)
- [ ] Session-expired mid-session redirects cleanly to `/login?reason=session_expired`
- [ ] Error boundaries never expose raw error messages to users
- [ ] Zero console errors on any page in production build
- [ ] All security headers present (verify at securityheaders.com — target A or B grade)
- [ ] CSP header present and not blocking any app functionality
- [ ] No secrets in client bundle (`grep -r SERVICE_ROLE .next/static/` returns nothing)
- [ ] `npm audit --audit-level=high` returns zero high/critical vulnerabilities
- [ ] All pages render correctly at 1280px, 1024px, 768px
- [ ] Lighthouse Performance score >80 on dashboard page
- [ ] Sign up → onboard → dashboard works end-to-end on production URL
- [ ] `/setup` first-admin flow works on a fresh Supabase project
- [ ] `/setup` inaccessible after first admin exists
- [ ] QA approval flow end-to-end on production URL (new SOP)
- [ ] QA approval flow end-to-end (update SOP → CC → signatures → completion)
- [ ] CC waive flow works for Admin
- [ ] PM task completion works on production URL
- [ ] Deactivated user cannot log in on production URL
- [ ] Realtime Pulse updates fire correctly in production (not just local)
- [ ] Cron routes accessible from Vercel with correct secret, return 401 without it
- [ ] `npm run build` passes with zero TypeScript errors and zero warnings

**Commit:** `phase-12: loading/empty/error states, security headers, a11y, csp, vercel deployment, launch verification`

---

## CURRENT STATE

> Update this section at the end of every phase. Read this first when starting a new session.

```
Last completed phase:  NONE
Current phase:         PHASE 0 — Project Bootstrap
Blockers:              None
Notes:                 —
Supabase project URL:  [fill in after Phase 0]
Vercel project URL:    [fill in after Phase 12]
CRON_SECRET rotation:  [record last rotation date here]
```

---

## QUICK REFERENCE — NEVER DO LIST

| Never Do This | Do This Instead |
|---------------|-----------------|
| Use `any` TypeScript type | Define a proper interface in `/types/app.types.ts` |
| Hard-delete a user profile | Set `profiles.is_active = false`. Never DELETE a profiles row. |
| Hardcode a department name string in code | Use `departments.name` from DB. Never `if (dept === 'QA')` in app code. Use `is_qa` flag on the departments table. |
| Check `is_admin` on the client to gate UI | Gate in RLS + server actions. Client UI reflects server truth. |
| Allow QA to approve their own SOP submission | `approve_sop_request()` checks `submitted_by ≠ qa_user_id`. Reject with exception if they match. |
| Re-query signatories live from the CC page | Read from `change_controls.required_signatories` snapshot only. Never re-query live. |
| Fan out one pulse_items row per recipient for broadcasts | Use `audience='department'` or `audience='everyone'` — one row. Client filters by audience + dept. |
| Allow thread replies on `thread_depth = 1` items | Check `parent.thread_depth === 0` before inserting reply. Reject 400 if not. |
| Create a PM task without an `assigned_to` | `assigned_to` is NOT NULL. Always required. Set at equipment approval time. |
| Allow a locked SOP to accept new edit submissions | Check `sop.locked = true` before accepting upload. Reject with clear message. |
| Use service role key in a client component | Server-side only: API routes, server actions, server components |
| Filter SOPs by department in the RLS policy | Dept scoping is query-layer only. RLS enforces `status = 'active'` for employees. |
| Show Acknowledge button for cross-dept SOPs | Check `isOwnDept()` before rendering action bar. Server action double-checks before inserting. |
| Build the diff on the client | Pre-compute server-side. Store in `change_controls.diff_json`. |
| Use `dangerouslySetInnerHTML` without sanitising | Always `DOMPurify.sanitize()` before rendering mammoth.js output. |
| Create a new table for notices, alerts, or to-dos | Everything goes into `pulse_items` with a `type` tag. |
| Build department pages or department navigation | There are no dept pages. Dept is a filter, not a destination. |
| Insert into `audit_log` from client code | Server-side triggers and server actions only, using service role. |
| Grant or revoke `is_admin` without writing audit_log | Every `is_admin` change writes `admin_granted` or `admin_revoked` to audit_log. No exceptions. |
| Grant or revoke `is_admin` without password confirmation | `<PasswordConfirmModal />` is required before any is_admin change. |
| Delete a department that has users or SOPs | Check counts server-side before allowing delete. Return specific error with counts. |
| Allow major/minor version decisions to be free text | Use `increment_sop_version()` function. Version format is always `vMAJOR.MINOR`. |
| Use `requestAnimationFrame` for count-up | Magic UI `NumberTicker` with `duration={0.6}` |
| Build Pulse list animation manually | Magic UI `AnimatedList` |
| Use `ShimmerButton` on secondary or destructive actions | Shimmer for Sign, Approve, Submit — high emphasis only |
| Build the shell layout from scratch | Use `dashboard-01` block as starting point |
| Build auth screens from scratch | Use `login-02` and `signup-02` blocks |
| Mix icon libraries | Lucide React only. Zero exceptions. |
| Call cron routes without the secret header | All cron routes require `Authorization: Bearer ${CRON_SECRET}` |
| Use `getSession()` on the server | Always `getUser()` — validates JWT against Supabase Auth server |
| Skip the phase checklist | Run every item before committing |

---

*End of BUILD.md v2.1 — All architectural, security, data model, UX, and operational flaws addressed.*

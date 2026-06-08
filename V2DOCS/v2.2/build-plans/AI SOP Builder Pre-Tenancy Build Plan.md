# AI SOP Builder Pre-Tenancy Build Plan

Feature: AI SOP Builder  
Build target: Current QMS-MANAJA app before tenancy and feature-package billing  
Source references:
- `V2DOCS/v2.2/build-plans/QMS_MANAJA_AI_SOP_Builder_Build_Plan.docx`
- `V2DOCS/v2.2/strategy/AI SOP Builder Strategy.md`
- Prior product discussion on AI SOP generation, template-based Word output, chat, and comment-guided revision

## 1. Build Objective

Build the AI SOP Builder as a working in-app drafting feature before the full tenancy and package-pricing system is implemented.

The first usable version should let an authorized user:

1. Start a guided SOP generation session.
2. Provide SOP purpose, objective, scope, department, users, risks, records, and references.
3. Let the AI ask clarifying questions when information is missing.
4. Generate an SOP draft as Markdown.
5. Review the Markdown draft immediately inside the app.
6. Use chat and comments to request AI revisions.
7. When satisfied, generate a `.docx` file from the final Markdown using the selected SOP template rules.
8. Preview the Word file using the existing SOP read-view infrastructure.
9. Download the generated Word file.

This version is intentionally not tied to tenant plans, billing, or AI credits. Those controls will be added later when tenancy and package management are built.

## 2. Product Boundary

The AI SOP Builder creates draft SOPs only.

Generated SOPs must not become controlled SOPs automatically in this phase. They are not approved, effective, released, or part of formal document control until a later workflow submits them into the existing SOP approval process.

Every generated draft must clearly show:

- AI-generated draft status
- Not approved
- Not effective
- Requires formal review before use

The AI must not invent critical compliance details. If required information is missing, it should ask questions or mark the content with confirmation flags such as:

- `[CONFIRM OWNER]`
- `[CONFIRM VALUE]`
- `[CONFIRM FREQUENCY]`
- `[CONFIRM ACCEPTANCE CRITERIA]`

## 3. Important Change From the General Plan

The DOCX build plan assumes tenancy, feature entitlements, and credit billing already exist. For this build, those parts will be skipped or stubbed.

### Deferred Until Tenancy

- Tenant license checks
- Feature package checks
- AI credit deduction
- AI credit balance display
- Per-tenant billing events
- Per-plan template limits
- Platform admin credit configuration
- Submit-to-approval entitlement checks

### Built Now

- SOP Builder session flow
- AI harness
- Markdown draft generation
- Markdown preview
- Chat-based revision
- Comment-guided revision
- Template upload or template selection foundation
- Word document generation on demand
- Word preview using existing read-view pattern
- Audit trail for key actions
- Role-based access using current app roles

## 4. Recommended V1 User Experience

The user should not feel like they are using a blank editor. The feature should feel like a guided assistant.

### Main Screens

1. **SOP Builder Home**
   - List previous builder sessions.
   - Show status: Intake, Clarifying, Draft Ready, Revising, Word Generated, Completed.
   - Button: Start New SOP.

2. **New SOP Intake**
   - SOP title
   - Department
   - Purpose
   - Objective
   - Scope
   - Intended users
   - Equipment/materials
   - Risks/hazards
   - Records/forms/logbooks referenced
   - Regulatory/internal references
   - Optional template selection

3. **Builder Workspace**
   - Left/main panel: Markdown draft viewer.
   - Right panel: AI chat and revision instructions.
   - Side panel or drawer: comments.
   - Top status bar: draft version, status, last generated date.
   - Actions: Generate Draft, Revise Draft, Generate Word File, Preview Word File, Download Word File.

4. **Word Preview**
   - Uses the existing SOP read-view style after `.docx` generation.
   - Shows a visible draft warning above the viewer.

## 5. Draft Format Strategy

The AI should output Markdown first.

Reason:

- Faster to show in the app.
- Easier to revise back and forth.
- Easier to comment on.
- Easier to store and version.
- Word generation can happen only when the user is satisfied.

The app should store both:

- `markdown_content`: the user-visible draft
- `structured_content_json`: optional parsed structure used for reliable Word generation

For V1, the safest path is:

1. Ask the model to return structured JSON containing headings, blocks, tables, and procedure steps.
2. Convert that structured JSON into Markdown for the app viewer.
3. Use the same structured JSON to generate the Word document.

This avoids relying on fragile Markdown parsing when building `.docx` files.

## 6. Word Generation Strategy

The app cannot depend on a runtime Codex `/docx` skill. Instead, the implementation should build a server-side Word generation pipeline that follows the same document-generation rules we use when working with Word files.

The implementation should use:

- Server-side generation only
- `docx` npm package for base `.docx` creation
- Template parsing and placeholder replacement for uploaded company templates
- Supabase Storage for generated files
- Existing SOP read-view preview infrastructure

### Generation Flow

1. User reviews Markdown draft.
2. User clicks **Generate Word File**.
3. Server loads the active draft.
4. Server loads selected template or platform default template.
5. Server generates `.docx`.
6. Server stores file in Supabase Storage.
7. Server updates draft record with file path.
8. UI enables Word preview and download.

### Template Rule

Companies should be able to upload an empty SOP template that represents their preferred style.

The generated Word file should use that template as the formatting reference where possible:

- Logo
- Header
- Footer
- Title block
- Section order
- Table style
- Revision history layout
- Approval/signature areas

For the first build, template support can be best-effort. Strict placeholder enforcement can come later.

## 7. Data Model

Use current app scoping first. If the app already has organization-level fields, include them. If not, keep the schema user/department scoped and design it so `tenant_id` can be added later without rewriting the feature.

### `sop_builder_sessions`

Stores the overall builder session.

Recommended fields:

- `id uuid primary key`
- `created_by uuid not null`
- `organization_id uuid null`
- `title text not null`
- `department text null`
- `purpose text not null`
- `objective text null`
- `scope_text text null`
- `intended_users text null`
- `equipment text null`
- `risks text null`
- `records_forms text null`
- `regulatory_refs text null`
- `selected_template_id uuid null`
- `status text not null`
- `active_draft_id uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Statuses:

- `intake`
- `awaiting_clarification`
- `outline_ready`
- `drafting`
- `draft_ready`
- `revising`
- `word_generated`
- `completed`
- `cancelled`

### `sop_builder_messages`

Stores chat between user and AI.

Recommended fields:

- `id uuid primary key`
- `session_id uuid not null`
- `organization_id uuid null`
- `sender text not null`
- `message text not null`
- `message_type text not null`
- `related_draft_id uuid null`
- `created_at timestamptz not null`

Senders:

- `user`
- `agent`
- `system`

Message types:

- `chat`
- `clarification_question`
- `clarification_answer`
- `outline_feedback`
- `revision_instruction`
- `revision_summary`
- `system_notice`

### `sop_builder_drafts`

Stores every generated draft version.

Recommended fields:

- `id uuid primary key`
- `session_id uuid not null`
- `organization_id uuid null`
- `version int not null`
- `outline_json jsonb null`
- `structured_content_json jsonb not null`
- `markdown_content text not null`
- `docx_path text null`
- `preview_url text null`
- `change_summary text null`
- `model_used text null`
- `status text not null`
- `created_at timestamptz not null`

Draft statuses:

- `generating`
- `ready`
- `superseded`
- `word_generated`
- `exported`

### `sop_builder_comments`

Stores user comments that guide AI revision.

Recommended fields:

- `id uuid primary key`
- `session_id uuid not null`
- `draft_id uuid not null`
- `organization_id uuid null`
- `created_by uuid not null`
- `comment_text text not null`
- `quoted_text text null`
- `section_heading text null`
- `status text not null`
- `resolved_by_draft_id uuid null`
- `created_at timestamptz not null`

Statuses:

- `open`
- `resolved`
- `dismissed`

### `sop_builder_templates`

Stores uploaded SOP templates.

Recommended fields:

- `id uuid primary key`
- `organization_id uuid null`
- `name text not null`
- `file_path text not null`
- `file_size_bytes int not null`
- `version text null`
- `is_default boolean not null default false`
- `status text not null`
- `validation_status text not null`
- `validation_notes text null`
- `uploaded_by uuid not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Statuses:

- `active`
- `archived`

Validation statuses:

- `pending`
- `valid`
- `invalid`

### `sop_builder_exports`

Stores generated Word file exports.

Recommended fields:

- `id uuid primary key`
- `session_id uuid not null`
- `draft_id uuid not null`
- `organization_id uuid null`
- `exported_by uuid not null`
- `file_path text not null`
- `export_type text not null`
- `created_at timestamptz not null`

Export types:

- `word_generation`
- `download`

## 8. Storage Structure

Use private Supabase Storage paths.

Recommended paths:

- Templates: `sop-builder/templates/{template_id}.docx`
- Draft Word files: `sop-builder/sessions/{session_id}/draft-{version}.docx`
- Exports: `sop-builder/sessions/{session_id}/exports/{export_id}.docx`
- Future tenancy path: `tenant/{tenant_id}/sop-builder/...`

Do not make generated SOP files public. Use signed URLs or the existing relay pattern.

## 9. AI Harness

Create a server-side SOP Builder harness.

Recommended location:

- `lib/sop-builder/harness.ts`
- `lib/sop-builder/prompts.ts`
- `lib/sop-builder/markdown.ts`
- `lib/sop-builder/docx-generator.ts`
- `lib/sop-builder/template-parser.ts`
- `lib/sop-builder/template-validator.ts`

The harness should control:

- Intake validation
- Prompt assembly
- System instruction injection
- Clarification decisions
- Outline generation
- Draft generation
- Revision generation
- Markdown rendering
- Word generation handoff
- Version creation
- Error handling
- Audit logging

No client-side component should call the AI model directly.

## 10. AI System Instruction Requirements

The system instruction must be hardcoded server-side.

It must require the AI to:

- Generate draft SOPs only.
- Include an AI draft warning.
- Ask clarifying questions when information is missing.
- Avoid inventing acceptance criteria, frequencies, limits, regulatory claims, or ownership assignments.
- Use confirmation flags for uncertain information.
- Write clear SOP procedure steps.
- Follow the selected template structure when available.
- Return structured JSON for generation and revision steps.
- Summarize revisions after applying comments.

## 11. API Routes

Recommended routes:

- `POST /api/sop-builder/sessions`
- `GET /api/sop-builder/sessions`
- `GET /api/sop-builder/sessions/[id]`
- `PATCH /api/sop-builder/sessions/[id]`
- `POST /api/sop-builder/sessions/[id]/clarify`
- `POST /api/sop-builder/sessions/[id]/outline`
- `POST /api/sop-builder/sessions/[id]/generate`
- `POST /api/sop-builder/sessions/[id]/revise`
- `POST /api/sop-builder/drafts/[id]/comments`
- `GET /api/sop-builder/drafts/[id]/comments`
- `POST /api/sop-builder/drafts/[id]/generate-word`
- `GET /api/sop-builder/drafts/[id]/download`
- `POST /api/sop-builder/templates`
- `GET /api/sop-builder/templates`
- `PATCH /api/sop-builder/templates/[id]`
- `DELETE /api/sop-builder/templates/[id]`

## 12. UI Build Plan

### Sidebar / Navigation

Add a clear entry:

- `AI SOP Builder`

Recommended location:

- Keep it as its own main feature link, not buried inside SOP Library.

Reason:

- This feature creates draft SOPs before formal document control.
- SOP Library manages controlled or uploaded SOP records.
- Keeping the builder separate avoids confusing draft generation with approved SOP control.

### SOP Builder Home

Build:

- Session table/list
- Search by title
- Filter by status
- Start New SOP button
- Continue session action
- Completed/generated status indicators

### Intake Form

Build a focused form with strong validation and minimal clutter.

Include:

- Title
- Department
- Purpose
- Objective
- Scope
- Intended users
- Equipment/materials
- Risks/hazards
- Records/forms/logbooks
- References
- Template selector

### Workspace

Build a two-panel workspace:

- Main panel: Markdown preview
- Right panel: chat/revision instructions

Controls:

- Generate outline
- Approve outline
- Generate draft
- Request revision
- Generate Word file
- Preview Word file
- Download Word file

### Markdown Viewer

Use a polished read-only Markdown viewer.

It should support:

- Headings
- Tables
- Numbered procedure steps
- Warning banners
- Confirmation flags
- Revision summaries

Do not make it a rich text editor in V1.

### Comment-Guided Revision

Reuse the idea from the approval workflow comments, but adapt it for AI revision.

Comments should act as instructions to the AI, not approval notes.

Each comment should capture:

- Target section
- Optional quoted text
- Requested change
- Status

When the user clicks **Request Revision**, open comments and optional chat instruction are sent to the harness. The AI returns a new draft version.

## 13. Implementation Phases for This Build

### Phase 1: Foundation and Database

1. Add Supabase migration for builder tables.
2. Add RLS policies using current user/org access model.
3. Add private storage bucket or storage path convention.
4. Add server helper types for sessions, drafts, messages, comments, templates.
5. Add audit events for session creation, draft generation, revision, Word generation, download.

Deliverable:

Working persistence layer for SOP Builder sessions.

### Phase 2: AI Harness and Markdown Drafting

1. Create prompt/system instruction module.
2. Create AI harness server module.
3. Add intake-to-outline generation.
4. Add outline-to-draft generation.
5. Store structured JSON and Markdown.
6. Add model error handling.
7. Add fallback messages when AI fails.

Deliverable:

User can generate a Markdown SOP draft from intake.

### Phase 3: UI Workspace

1. Add sidebar link.
2. Build session list page.
3. Build intake page.
4. Build workspace page.
5. Build Markdown preview.
6. Build AI chat panel.
7. Build outline review.
8. Build draft status controls.

Deliverable:

User can complete the main AI drafting flow in the app.

### Phase 4: Revision Loop

1. Add comments table/API.
2. Add comment sidebar/dialog.
3. Add revise endpoint.
4. Assemble open comments and chat instruction into revision prompt.
5. Create new draft version on revision.
6. Mark previous draft superseded.
7. Mark addressed comments resolved.
8. Show version history.

Deliverable:

User can revise drafts back and forth without editing raw text.

### Phase 5: Word Generation

1. Add base Word generator.
2. Convert structured SOP content into `.docx`.
3. Add default SOP template.
4. Add template upload and validation.
5. Add template selection.
6. Generate Word file only when user clicks **Generate Word File**.
7. Store generated `.docx`.
8. Enable preview using existing read-view infrastructure.
9. Enable download.

Deliverable:

User can generate, preview, and download a Word SOP file.

### Phase 6: Hardening and Polish

1. Add loading states for long AI calls.
2. Add progress feedback during draft and Word generation.
3. Add clear empty states.
4. Add retry paths for failed AI calls.
5. Add file validation errors for templates.
6. Add strict access checks.
7. Add targeted tests.
8. Add QA test checklist.

Deliverable:

Feature is stable enough for internal testing and demo use.

## 14. Access Control for Pre-Tenancy Build

Until tenancy and plan packaging are implemented, access should be controlled by current app roles.

Recommended V1 access:

- Admin: full access
- QA: full access
- HOD/Manager: can start and manage own sessions
- Standard User: no access by default

Template management:

- Admin
- QA

This can later be replaced with feature entitlement checks.

## 15. Testing Checklist

### Functional

- User can start a session.
- Intake validation blocks missing required fields.
- AI can ask clarifying questions.
- AI can generate an outline.
- AI can generate a Markdown draft.
- Markdown preview renders headings, tables, steps, and warnings.
- User can add comments.
- User can request revision.
- New draft version is created.
- Previous draft is not overwritten.
- Word file can be generated from final draft.
- Word file can be previewed.
- Word file can be downloaded.

### Compliance

- Draft warning is always visible.
- AI does not mark output as approved/effective.
- Confirmation flags remain where required.
- Generated files are private.
- All major actions are audit logged.

### Security

- User cannot access another user's restricted session.
- Storage URLs are signed or proxied.
- AI API key is server-side only.
- Template uploads reject non-docx files.
- Template uploads reject oversized files.

### Regression

- Existing SOP Library still works.
- Existing SOP read view still works.
- Existing approval comments are not affected.
- Existing document control numbering is not affected.
- Existing PWA/push features are not affected.

## 16. What Not To Build Yet

Do not build these in the first implementation pass:

- AI credit billing
- Plan/package gating
- Tenant admin controls
- Super admin controls
- Submit to controlled SOP approval
- Existing SOP knowledge retrieval
- Training suggestions
- Form/logbook auto-creation
- Risk intelligence engine
- Multi-site tenant logic

These are valuable, but they should come after the core drafting loop proves itself.

## 17. Build Order I Will Follow

1. Inspect current app structure for routes, sidebar, Supabase helpers, storage helpers, SOP read view, and approval comments.
2. Add database migration and types for SOP Builder.
3. Add server-side SOP Builder modules.
4. Add API routes.
5. Add UI entry and session list.
6. Add intake and workspace pages.
7. Add Markdown generation and preview.
8. Add chat clarification and revision loop.
9. Add comment-guided revision.
10. Add Word generation and storage.
11. Add Word preview/download.
12. Add audit logging and access control.
13. Run TypeScript, lint, migration dry-run, and focused manual testing.
14. Commit and push to the active PR branch after verification.

## 18. Acceptance Criteria

The feature is ready for review when:

- A QA/Admin user can create a new AI SOP Builder session.
- The AI can generate an SOP draft as Markdown.
- The user can revise the draft through chat/comments.
- Every revision creates a new version.
- The user can generate a Word file from the selected final draft.
- The Word file opens in the existing SOP read-view flow.
- The Word file can be downloaded.
- Draft status is clear and cannot be confused with controlled approval.
- Existing SOP control workflows remain unchanged.


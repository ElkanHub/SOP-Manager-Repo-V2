# SOP-Guard Pro — TrainingBuild.md
> **Feature Build Plan** | Training Module
> Complete agent instruction file for building the Training feature end-to-end.
> Read this entire file before writing a single line of code.
> Build in the exact order specified. Do not skip any step. Do not defer checklist items.

---

## CRITICAL — READ BEFORE STARTING

This feature touches many existing parts of the app. Before writing any code:

1. Read `BUILD.md` in full — understand the existing architecture, naming conventions, and ground rules.
2. Read the existing `actions/` files to understand the server action pattern used throughout the app.
3. Read `components/app-sidebar.tsx` to understand how nav items and badges are added.
4. Read the existing `reports/` components to understand the report page pattern before adding Training reports.
5. Read the existing `pulse/` components to understand how new pulse item types are added.
6. Read the DOCBUILD.md to understand how documentation pages are structured before adding training docs.
7. Confirm the exact `pulse_items` type CHECK constraint — you will add two new types to it.
8. Confirm the Tailwind v4 dark mode token pattern used throughout — use `bg-card`, `text-foreground`, `border-border` etc. **Never hardcode colours.**
9. Confirm how `pptxgenjs` is or is not already installed. If not, install it.
10. Confirm `is_qa_manager()` and `is_active_user()` DB functions exist and their exact signatures.

**Do not break any existing functionality.** This is an additive feature. If in doubt about touching an existing file, add rather than modify.

---

## FEATURE OVERVIEW

The Training Module allows Managers and QA Managers to create training content directly from SOPs in the library. Gemini AI generates slide decks and questionnaires from the SOP content. Assigned trainees complete training online or on paper. Every action is logged for compliance. QA is notified of all training activity.

### Access Rules

| Action | Who Can Do It |
|--------|--------------|
| Create training modules | Managers (own dept) + QA Managers (all depts) |
| Assign trainees | Managers → own dept members only. QA Managers → any dept. |
| Edit / regenerate content | Module creator only |
| Lock questionnaire after publishing | System-enforced — no editing once assigned |
| Complete training / answer questionnaire | Any assigned user (Employee or Manager) |
| View completion records | Module creator + QA Managers + Admins |
| Access Training reports | Managers (own dept) + QA Managers (all depts) + Admins |
| View "My Training" | Any authenticated active user who has been assigned training |

### The SOP Link Is Central

Every training module is anchored to a specific Active SOP. When that SOP is updated via Change Control and a new version goes Active, every training module linked to it is automatically flagged as `needs_review`. The creator receives a Pulse notification. Training stays current with procedures.

---

## INSTALL DEPENDENCIES

Install these before writing any code. Do not proceed without them.

```bash
npm install pptxgenjs
npm install @types/pptxgenjs
npm install jspdf
npm install html2canvas
```

Verify `pptxgenjs` works server-side — it must be imported in a server action, not a client component, because it generates binary files. Use dynamic import in the server action:

```typescript
const PptxGenJS = (await import('pptxgenjs')).default
```

---

## DATABASE MIGRATION

### File: `supabase/migrations/030_training.sql`

Create this file and run it in the Supabase SQL editor. Every statement uses `IF NOT EXISTS` — safe to re-run.

```sql
-- ═══════════════════════════════════════════════════════════════════
-- TRAINING MODULES
-- The top-level container. Linked to one Active SOP.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_modules (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  title                 text        NOT NULL,
  description           text,
  created_by            uuid        NOT NULL REFERENCES profiles(id),
  department            text        NOT NULL REFERENCES departments(name),

  -- SOP link (required — all training is SOP-driven)
  sop_id                uuid        NOT NULL REFERENCES sops(id),
  sop_version           text        NOT NULL,  -- version at time of module creation

  -- Status
  status                text        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','published','archived')),

  -- SOP staleness flag — set to true by trigger when linked SOP version changes
  needs_review          boolean     NOT NULL DEFAULT false,

  -- Completion settings
  is_mandatory          boolean     NOT NULL DEFAULT false,
  deadline              date,       -- optional: assigned users must complete by this date

  -- Slide deck (stored as JSON array of slide objects)
  slide_deck            jsonb,      -- null until generated
  slide_deck_generated_at timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- TRAINING ASSIGNMENTS
-- Which users are assigned to which modules.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid        NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  assignee_id     uuid        NOT NULL REFERENCES profiles(id),
  assigned_by     uuid        NOT NULL REFERENCES profiles(id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  status          text        NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started','in_progress','completed')),
  completed_at    timestamptz,
  UNIQUE (module_id, assignee_id)  -- one assignment per person per module
);

-- ═══════════════════════════════════════════════════════════════════
-- QUESTIONNAIRES
-- A module can have multiple questionnaires.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_questionnaires (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       uuid        NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  passing_score   int         NOT NULL DEFAULT 70  -- percentage, 0-100
                  CHECK (passing_score BETWEEN 0 AND 100),
  status          text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','published')),
                  -- LOCK RULE: once published, no edits allowed.
                  -- Enforced in server action. No DB-level lock needed
                  -- because all mutations go through server actions.
  version         int         NOT NULL DEFAULT 1,  -- increments if manager creates a new version
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- QUESTIONS
-- Individual questions within a questionnaire.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_questions (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id    uuid    NOT NULL REFERENCES training_questionnaires(id) ON DELETE CASCADE,
  question_text       text    NOT NULL,
  question_type       text    NOT NULL
                      CHECK (question_type IN ('multiple_choice','true_false','short_answer','fill_blank')),
  options             jsonb,  -- for multiple_choice: [{ "id": "a", "text": "...", "is_correct": true }]
                              -- for true_false:      [{ "id": "true", "text": "True", "is_correct": true }, ...]
                              -- for short_answer:    null
                              -- for fill_blank:      null (correct answer in correct_answer field)
  correct_answer      text,   -- for short_answer and fill_blank (used as reference, not auto-marked)
  sop_section_ref     text,   -- which section of the SOP this question came from (AI-generated tag)
  display_order       int     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- QUESTIONNAIRE ATTEMPTS
-- Each time a trainee takes a questionnaire, one row is created.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_attempts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id    uuid        NOT NULL REFERENCES training_questionnaires(id),
  questionnaire_version int       NOT NULL,  -- snapshot of version at attempt time
  respondent_id       uuid        NOT NULL REFERENCES profiles(id),
  module_id           uuid        NOT NULL REFERENCES training_modules(id),
  sop_id              uuid        NOT NULL REFERENCES sops(id),
  sop_version         text        NOT NULL,  -- SOP version at time of attempt
  started_at          timestamptz NOT NULL DEFAULT now(),
  submitted_at        timestamptz,           -- null until submitted
  score               numeric(5,2),          -- percentage, e.g. 85.00
  passed              boolean,               -- true if score >= passing_score
  completion_method   text        NOT NULL DEFAULT 'digital'
                      CHECK (completion_method IN ('digital','paper_recorded')),
  paper_scan_url      text,                  -- if paper: optional scanned PDF stored in Storage
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, respondent_id, questionnaire_version)
  -- one attempt per person per questionnaire version
  -- if manager creates a new version, the unique constraint allows a new attempt
);

-- ═══════════════════════════════════════════════════════════════════
-- QUESTION ANSWERS
-- Individual answers within an attempt.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_answers (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid    NOT NULL REFERENCES training_attempts(id) ON DELETE CASCADE,
  question_id     uuid    NOT NULL REFERENCES training_questions(id),
  answer_value    text,   -- the answer given (option id for MC/TF, free text for SA/FB)
  is_correct      boolean -- null for short_answer (not auto-marked)
);

-- ═══════════════════════════════════════════════════════════════════
-- TRAINING AUDIT LOG ENTRIES
-- All training events written here AND to the main audit_log.
-- This table powers the Training section in Reports.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid        NOT NULL REFERENCES profiles(id),
  action          text        NOT NULL
                  CHECK (action IN (
                    'module_created',
                    'module_published',
                    'module_archived',
                    'module_needs_review',   -- triggered when linked SOP updates
                    'trainee_assigned',
                    'training_started',
                    'training_completed',
                    'questionnaire_created',
                    'questionnaire_published',
                    'attempt_submitted',
                    'paper_completion_recorded',
                    'slide_deck_generated',
                    'questionnaire_generated',
                    'certificate_downloaded'
                  )),
  module_id       uuid        REFERENCES training_modules(id),
  questionnaire_id uuid       REFERENCES training_questionnaires(id),
  attempt_id      uuid        REFERENCES training_attempts(id),
  target_user_id  uuid        REFERENCES profiles(id),  -- for assignment events
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- training_log is append-only — no UPDATE or DELETE policies.

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS training_modules_dept_idx
  ON training_modules(department, status);

CREATE INDEX IF NOT EXISTS training_modules_sop_idx
  ON training_modules(sop_id);

CREATE INDEX IF NOT EXISTS training_assignments_assignee_idx
  ON training_assignments(assignee_id, status);

CREATE INDEX IF NOT EXISTS training_assignments_module_idx
  ON training_assignments(module_id);

CREATE INDEX IF NOT EXISTS training_attempts_respondent_idx
  ON training_attempts(respondent_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS training_attempts_module_idx
  ON training_attempts(module_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS training_log_actor_idx
  ON training_log(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS training_log_module_idx
  ON training_log(module_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- updated_at on training_modules
CREATE OR REPLACE FUNCTION update_training_module_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_training_module_updated_at
BEFORE UPDATE ON training_modules
FOR EACH ROW EXECUTE FUNCTION update_training_module_updated_at();

-- updated_at on training_questionnaires
CREATE OR REPLACE FUNCTION update_training_questionnaire_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_training_questionnaire_updated_at
BEFORE UPDATE ON training_questionnaires
FOR EACH ROW EXECUTE FUNCTION update_training_questionnaire_updated_at();

-- SOP staleness trigger:
-- When a SOP's version changes (Change Control completes and new version goes Active),
-- mark all training modules linked to that SOP as needs_review = true
-- and send a pulse notification to each module's creator.
CREATE OR REPLACE FUNCTION flag_training_modules_on_sop_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  mod RECORD;
BEGIN
  -- Only fire when version changes (new CC just activated new version)
  IF NEW.version = OLD.version THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  FOR mod IN
    SELECT id, created_by, title FROM training_modules
    WHERE sop_id = NEW.id
      AND status = 'published'
      AND needs_review = false
  LOOP
    UPDATE training_modules
    SET needs_review = true, updated_at = now()
    WHERE id = mod.id;

    -- Pulse notification to module creator
    INSERT INTO pulse_items (
      recipient_id, sender_id, type, title, body,
      entity_type, entity_id, audience
    ) VALUES (
      mod.created_by, NULL, 'training_needs_review',
      'Training Content Outdated',
      'The SOP linked to "' || mod.title || '" has been updated to ' || NEW.version ||
      '. Review and regenerate your training content.',
      'training_module', mod.id, 'self'
    );

    -- Training log entry
    INSERT INTO training_log (actor_id, action, module_id, metadata)
    VALUES (
      mod.created_by, 'module_needs_review', mod.id,
      jsonb_build_object('new_sop_version', NEW.version, 'sop_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_flag_training_on_sop_update
AFTER UPDATE ON sops
FOR EACH ROW EXECUTE FUNCTION flag_training_modules_on_sop_update();

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;

-- ── training_modules ─────────────────────────────────────────────

-- Managers see modules they created
CREATE POLICY "managers see own modules"
ON training_modules FOR SELECT
USING (created_by = auth.uid() AND is_active_user(auth.uid()));

-- QA Managers see all modules across all departments
CREATE POLICY "qa sees all modules"
ON training_modules FOR SELECT
USING (is_qa_manager(auth.uid()));

-- Admins see all modules
CREATE POLICY "admins see all modules"
ON training_modules FOR SELECT
USING (is_admin(auth.uid()));

-- Assignees see published modules they are assigned to
CREATE POLICY "assignees see assigned published modules"
ON training_modules FOR SELECT
USING (
  status = 'published'
  AND is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_assignments
    WHERE module_id = training_modules.id
      AND assignee_id = auth.uid()
  )
);

-- Only Managers and QA Managers can INSERT modules
CREATE POLICY "managers can create modules"
ON training_modules FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Only the creator can UPDATE their own module (via server action)
CREATE POLICY "creators can update own modules"
ON training_modules FOR UPDATE
USING (created_by = auth.uid() AND is_active_user(auth.uid()));

-- No DELETE — use status = 'archived' instead
-- (No DELETE policy intentionally)

-- ── training_assignments ──────────────────────────────────────────

-- Module creators and QA Managers and Admins see all assignments for a module
CREATE POLICY "managers see assignments for own modules"
ON training_assignments FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = module_id AND tm.created_by = auth.uid()
    )
  )
);

-- Assignees see their own assignment rows
CREATE POLICY "assignees see own assignments"
ON training_assignments FOR SELECT
USING (assignee_id = auth.uid() AND is_active_user(auth.uid()));

-- Module creators and QA Managers can assign trainees
CREATE POLICY "managers can assign trainees"
ON training_assignments FOR INSERT
WITH CHECK (
  assigned_by = auth.uid()
  AND is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Assignees can update their own assignment status (in_progress, completed)
CREATE POLICY "assignees can update own assignment status"
ON training_assignments FOR UPDATE
USING (assignee_id = auth.uid() AND is_active_user(auth.uid()));

-- ── training_questionnaires ───────────────────────────────────────

-- Same visibility as modules (module creators + QA + admins + assignees)
CREATE POLICY "module access governs questionnaire access"
ON training_questionnaires FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = module_id AND tm.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM training_assignments ta
      JOIN training_modules tm ON tm.id = ta.module_id
      WHERE tm.id = module_id AND ta.assignee_id = auth.uid()
      AND tm.status = 'published'
    )
  )
);

-- Module creators can insert and update questionnaires (draft only — server action enforces lock)
CREATE POLICY "creators can manage questionnaires"
ON training_questionnaires FOR INSERT
WITH CHECK (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_modules tm
    WHERE tm.id = module_id AND tm.created_by = auth.uid()
  )
);

CREATE POLICY "creators can update draft questionnaires"
ON training_questionnaires FOR UPDATE
USING (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_modules tm
    WHERE tm.id = module_id AND tm.created_by = auth.uid()
  )
);

-- ── training_questions ────────────────────────────────────────────

CREATE POLICY "questionnaire access governs question access"
ON training_questions FOR SELECT
USING (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_questionnaires tq
    JOIN training_modules tm ON tm.id = tq.module_id
    WHERE tq.id = questionnaire_id
    AND (
      tm.created_by = auth.uid()
      OR is_qa_manager(auth.uid())
      OR is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM training_assignments ta
        WHERE ta.module_id = tm.id AND ta.assignee_id = auth.uid()
        AND tm.status = 'published'
      )
    )
  )
);

CREATE POLICY "creators can manage questions"
ON training_questions FOR INSERT
WITH CHECK (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_questionnaires tq
    JOIN training_modules tm ON tm.id = tq.module_id
    WHERE tq.id = questionnaire_id AND tm.created_by = auth.uid()
    AND tq.status = 'draft'  -- can only add questions to draft questionnaires
  )
);

CREATE POLICY "creators can update questions in draft questionnaires"
ON training_questions FOR UPDATE
USING (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_questionnaires tq
    JOIN training_modules tm ON tm.id = tq.module_id
    WHERE tq.id = questionnaire_id AND tm.created_by = auth.uid()
    AND tq.status = 'draft'
  )
);

CREATE POLICY "creators can delete questions from draft questionnaires"
ON training_questions FOR DELETE
USING (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_questionnaires tq
    JOIN training_modules tm ON tm.id = tq.module_id
    WHERE tq.id = questionnaire_id AND tm.created_by = auth.uid()
    AND tq.status = 'draft'
  )
);

-- ── training_attempts ─────────────────────────────────────────────

-- Respondents see their own attempts
CREATE POLICY "respondents see own attempts"
ON training_attempts FOR SELECT
USING (respondent_id = auth.uid() AND is_active_user(auth.uid()));

-- Module creators, QA, Admins see all attempts for their modules
CREATE POLICY "managers see attempts for own modules"
ON training_attempts FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = module_id AND tm.created_by = auth.uid()
    )
  )
);

-- Assigned users can insert attempts
CREATE POLICY "assignees can start attempts"
ON training_attempts FOR INSERT
WITH CHECK (
  respondent_id = auth.uid()
  AND is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_assignments ta
    WHERE ta.module_id = module_id AND ta.assignee_id = auth.uid()
  )
);

-- Respondents can update their own in-progress attempts (to submit)
CREATE POLICY "respondents can submit own attempts"
ON training_attempts FOR UPDATE
USING (respondent_id = auth.uid() AND is_active_user(auth.uid()));

-- ── training_answers ──────────────────────────────────────────────

CREATE POLICY "respondents see own answers"
ON training_answers FOR SELECT
USING (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_attempts ta
    WHERE ta.id = attempt_id AND ta.respondent_id = auth.uid()
  )
);

CREATE POLICY "managers see answers for own module attempts"
ON training_answers FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM training_attempts ta
      JOIN training_modules tm ON tm.id = ta.module_id
      WHERE ta.id = attempt_id AND tm.created_by = auth.uid()
    )
  )
);

CREATE POLICY "respondents can insert answers"
ON training_answers FOR INSERT
WITH CHECK (
  is_active_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM training_attempts ta
    WHERE ta.id = attempt_id AND ta.respondent_id = auth.uid()
    AND ta.submitted_at IS NULL  -- can only add answers before submission
  )
);

-- ── training_log ──────────────────────────────────────────────────

-- QA Managers and Admins see all training log entries
CREATE POLICY "qa and admins see training log"
ON training_log FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (is_qa_manager(auth.uid()) OR is_admin(auth.uid()))
);

-- Managers see log entries for their own modules
CREATE POLICY "managers see own module log entries"
ON training_log FOR SELECT
USING (
  is_active_user(auth.uid())
  AND actor_id = auth.uid()
);

-- INSERT only via server actions using service role
-- (No app-level INSERT policy — enforces append-only via service role)

-- ═══════════════════════════════════════════════════════════════════
-- PULSE ITEM TYPE EXTENSION
-- Add training pulse types to the CHECK constraint.
-- ═══════════════════════════════════════════════════════════════════
-- NOTE: Run the following ONLY after reading the current CHECK constraint.
-- Use this query first to get the actual constraint definition:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'pulse_items'::regclass AND contype = 'c';
--
-- Then drop the old constraint and recreate with these additions:
--   'training_assigned'    ← sent to trainee when assigned
--   'training_due'         ← sent to trainee 7 days before deadline
--   'training_completed'   ← sent to module creator when trainee completes
--   'training_needs_review' ← sent to creator when linked SOP updates
--
-- The agent must read and carefully modify the existing constraint —
-- do NOT guess. Include ALL existing types plus the four new ones.
```

---

## TYPESCRIPT TYPES

### Add to `/types/app.types.ts`

```typescript
// ── Training ────────────────────────────────────────────────────

export type TrainingModuleStatus = 'draft' | 'published' | 'archived'
export type TrainingAssignmentStatus = 'not_started' | 'in_progress' | 'completed'
export type QuestionnaireStatus = 'draft' | 'published'
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
export type CompletionMethod = 'digital' | 'paper_recorded'

export interface QuestionOption {
  id:         string    // 'a' | 'b' | 'c' | 'd' or 'true' | 'false'
  text:       string
  is_correct: boolean
}

export interface TrainingModule {
  id:                       string
  title:                    string
  description:              string | null
  created_by:               string
  department:               string
  sop_id:                   string
  sop_version:              string
  status:                   TrainingModuleStatus
  needs_review:             boolean
  is_mandatory:             boolean
  deadline:                 string | null
  slide_deck:               TrainingSlide[] | null
  slide_deck_generated_at:  string | null
  created_at:               string
  updated_at:               string
  // Joined
  sop?:                     Pick<SopRecord, 'id' | 'sop_number' | 'title' | 'version' | 'status'>
  creator?:                 Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  assignee_count?:          number
  completion_count?:        number
  questionnaire_count?:     number
}

export interface TrainingSlide {
  id:        string           // uuid generated client-side
  type:      'title' | 'objectives' | 'content' | 'summary' | 'edge_cases' | 'resources'
  title:     string
  body:      string           // plain text, may contain \n for line breaks
  notes?:    string           // presenter notes (optional)
  order:     number
}

export interface TrainingAssignment {
  id:           string
  module_id:    string
  assignee_id:  string
  assigned_by:  string
  assigned_at:  string
  status:       TrainingAssignmentStatus
  completed_at: string | null
  // Joined
  assignee?:    Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department' | 'role'>
  module?:      Pick<TrainingModule, 'id' | 'title' | 'sop_id' | 'is_mandatory' | 'deadline'>
}

export interface TrainingQuestionnaire {
  id:             string
  module_id:      string
  title:          string
  description:    string | null
  passing_score:  number
  status:         QuestionnaireStatus
  version:        number
  created_at:     string
  updated_at:     string
  // Joined
  questions?:     TrainingQuestion[]
  attempt_count?: number
}

export interface TrainingQuestion {
  id:               string
  questionnaire_id: string
  question_text:    string
  question_type:    QuestionType
  options:          QuestionOption[] | null
  correct_answer:   string | null
  sop_section_ref:  string | null
  display_order:    number
}

export interface TrainingAttempt {
  id:                     string
  questionnaire_id:       string
  questionnaire_version:  number
  respondent_id:          string
  module_id:              string
  sop_id:                 string
  sop_version:            string
  started_at:             string
  submitted_at:           string | null
  score:                  number | null
  passed:                 boolean | null
  completion_method:      CompletionMethod
  paper_scan_url:         string | null
  created_at:             string
  // Joined
  respondent?:            Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
  answers?:               TrainingAnswer[]
}

export interface TrainingAnswer {
  id:           string
  attempt_id:   string
  question_id:  string
  answer_value: string | null
  is_correct:   boolean | null
}

export interface TrainingLogEntry {
  id:               string
  actor_id:         string
  action:           string
  module_id:        string | null
  questionnaire_id: string | null
  attempt_id:       string | null
  target_user_id:   string | null
  metadata:         Record<string, unknown> | null
  created_at:       string
  // Joined
  actor?:           Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
  target_user?:     Pick<Profile, 'id' | 'full_name' | 'department'>
  module?:          Pick<TrainingModule, 'id' | 'title'>
}
```

---

## API ROUTES

### `/api/training/generate-slides/route.ts`

```typescript
// POST — generates a slide deck from a SOP using Gemini
// Body: { moduleId: string, sopId: string }
// Auth: session required, role must be 'manager'
// Validation:
//   - Verify session and is_active
//   - Verify caller is the module creator OR is_qa_manager
//   - Fetch the SOP content from Storage using mammoth.extractRawText()
//   - Build the Gemini prompt (see PROMPT SPECIFICATIONS below)
//   - Call Gemini Flash API
//   - Parse the response into TrainingSlide[] (see SLIDE SCHEMA below)
//   - UPDATE training_modules SET slide_deck = slides,
//     slide_deck_generated_at = now() WHERE id = moduleId
//   - Insert training_log entry: action = 'slide_deck_generated'
//   - Return { slides: TrainingSlide[] }
//
// Error handling:
//   - 401 if no session
//   - 403 if not manager or not module creator
//   - 404 if module or SOP not found
//   - 422 if SOP file cannot be fetched or parsed
//   - 500 if Gemini call fails (return error message, do not crash)
```

### `/api/training/generate-questionnaire/route.ts`

```typescript
// POST — generates questions for a questionnaire from a SOP
// Body: { questionnaireId: string, sopId: string, questionCount: number }
// questionCount: min 5, max 20
// Auth: session required, role must be 'manager'
// Validation:
//   - Verify session and is_active
//   - Verify questionnaire is in 'draft' status — reject if published
//   - Verify caller is the module creator OR is_qa_manager
//   - Fetch SOP content with mammoth.extractRawText()
//   - Build the Gemini prompt for questionnaire generation
//   - Parse response into TrainingQuestion[]
//   - DELETE existing questions for this questionnaire (replace, not append)
//   - INSERT new questions with display_order 1..N
//   - Insert training_log entry: action = 'questionnaire_generated'
//   - Return { questions: TrainingQuestion[] }
```

### `/api/training/export-slides/route.ts`

```typescript
// POST — generates and streams a .pptx file
// Body: { moduleId: string, format: 'pptx' | 'pdf' }
// Auth: session required
// For 'pptx':
//   - Build presentation using pptxgenjs (dynamic import)
//   - Apply brand colours: navy #0D2B55, teal #00C2A8, blue #1A5EA8
//   - One slide per TrainingSlide object in slide_deck
//   - Title slide: large title, SOP number and version subtitle, brand navy background
//   - Content slides: slide title, body text as bullet points, teal accent bar on left
//   - Return as binary stream with Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
//   - Content-Disposition: attachment; filename="[module-title]-training.pptx"
// For 'pdf':
//   - Generate the same content as HTML on the server
//   - Use jspdf to convert
//   - Return as binary stream with Content-Type: application/pdf
```

### `/api/training/export-questionnaire/route.ts`

```typescript
// POST — generates a printable PDF of a questionnaire
// Body: { questionnaireId: string }
// Auth: session required, must be module creator or QA/Admin
// Generates a print-ready PDF:
//   - Header: SOP title, SOP number, questionnaire title, department, date
//   - Instructions section: "Answer all questions. Circle the correct option for
//     multiple choice. Write your answers clearly."
//   - Questions numbered 1..N
//   - Multiple choice: options listed with circles (A B C D)
//   - True/False: two options with circles
//   - Short answer: blank lines for writing
//   - Fill in blank: sentence with underline for the blank
//   - Footer: "Name: ____________  Date: ____________  Signature: ____________"
//   - Does NOT include correct answers — this is the print version for trainees
// Return as PDF binary stream
```

---

## GEMINI PROMPT SPECIFICATIONS

### Slide Deck Generation Prompt

```typescript
const slidePrompt = `
You are a professional training content developer for an industrial compliance platform.

Generate a structured training slide deck from the following Standard Operating Procedure.

SOP Title: ${sopTitle}
SOP Number: ${sopNumber}
Department: ${department}

SOP Content:
---
${sopPlainText}
---

Generate exactly the following slides in this order:
1. TITLE slide: title="${sopTitle} — Training", subtitle="Based on ${sopNumber} v${sopVersion}"
2. OBJECTIVES slide: 3-5 clear learning objectives starting with action verbs (e.g. "Identify...", "Explain...", "Demonstrate...")
3-N. CONTENT slides: one slide per major section of the SOP. Each slide: title = section name, body = 3-5 key bullet points from that section. Maximum 8 content slides.
N+1. SUMMARY slide: title="Key Takeaways", body = the 5 most critical points from the entire SOP
N+2. EDGE_CASES slide: title="What To Do If...", body = common exceptions, escalation paths, or edge cases mentioned in the SOP. If none are mentioned, generate 3 likely edge cases based on the content.
N+3. RESOURCES slide: title="References", body = "Full procedure: ${sopNumber}\nApproved by QA — Version ${sopVersion}\nAccess the live document in the SOP Library."

Respond ONLY with a valid JSON array. No markdown, no explanation, no code blocks.
Each element must have: { "type": string, "title": string, "body": string, "order": number }
type must be one of: "title", "objectives", "content", "summary", "edge_cases", "resources"
`
```

### Questionnaire Generation Prompt

```typescript
const questionnairePrompt = `
You are an expert assessor for industrial compliance training.

Generate ${questionCount} questions to test understanding of the following Standard Operating Procedure.

SOP Title: ${sopTitle}
SOP Number: ${sopNumber}

SOP Content:
---
${sopPlainText}
---

Requirements:
- Mix of question types: aim for 60% multiple choice, 20% true/false, 20% short answer or fill in the blank
- Each question must test genuine understanding, not just memory of words
- Multiple choice questions must have exactly 4 options (a, b, c, d)
- Exactly one correct answer per multiple choice or true/false question
- Short answer questions should test ability to explain a process or identify a key step
- Tag each question with the SOP section it came from (sop_section_ref)
- Questions must increase in difficulty: easy → medium → hard

Respond ONLY with a valid JSON array. No markdown, no explanation, no code blocks.
Each element must have:
{
  "question_text": string,
  "question_type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank",
  "options": [{ "id": "a"|"b"|"c"|"d"|"true"|"false", "text": string, "is_correct": boolean }] | null,
  "correct_answer": string | null,
  "sop_section_ref": string,
  "display_order": number
}
`
```

Both prompts must be wrapped in try/catch. If Gemini returns malformed JSON, retry once with a stricter prompt. If it fails twice, return a 500 with a user-facing message: "AI generation failed. Please try again. If the problem persists, check that the SOP document is readable."

---

## SERVER ACTIONS

### File: `/actions/training.ts`

Build all server actions in this file. Match the session validation pattern used in other action files.

---

#### `createTrainingModule(data)`

```typescript
// data: { title, description, sopId, department, isMandatory, deadline? }
// Validation:
//   - Session + is_active
//   - role = 'manager' — employees cannot create modules
//   - Department scope: if NOT qa_manager, department must equal user's own department
//   - sopId must reference an Active SOP
//   - title: required, 3–120 chars
// Action:
//   - INSERT training_modules with sop_version = current SOP version
//   - INSERT training_log: action = 'module_created'
//   - INSERT audit_log: action = 'training_module_created'
//   - Return { success: true, moduleId: string }
```

#### `publishTrainingModule(moduleId)`

```typescript
// Validation:
//   - Session + is_active
//   - Caller must be module creator OR qa_manager
//   - Module must have at least one published questionnaire before publishing
//   - Module must have slide_deck (not null) before publishing
// Action:
//   - UPDATE training_modules SET status = 'published'
//   - Notify all assignees who are not_started via pulse: type = 'training_assigned'
//   - INSERT training_log: action = 'module_published'
//   - INSERT audit_log
//   - Return { success: true }
```

#### `archiveTrainingModule(moduleId)`

```typescript
// Validation: session, is_active, creator OR qa_manager
// Action:
//   - UPDATE training_modules SET status = 'archived'
//   - INSERT training_log: action = 'module_archived'
//   - INSERT audit_log
//   - Return { success: true }
```

#### `assignTrainees(moduleId, assigneeIds[])`

```typescript
// Validation:
//   - Session + is_active
//   - role = 'manager'
//   - Caller must be module creator OR qa_manager
//   - DEPARTMENT SCOPE ENFORCEMENT:
//     if NOT qa_manager: every assigneeId must belong to user's own department
//     if qa_manager: any active user in any department is allowed
//   - Module must be in 'published' status to assign
//   - Skip duplicates (already assigned users) silently — use INSERT ... ON CONFLICT DO NOTHING
// Action:
//   - INSERT training_assignments for each new assignee
//   - For each new assignee, INSERT pulse_items: type = 'training_assigned'
//     title: 'New Training Assigned'
//     body: 'You have been assigned: "[module title]". [is_mandatory ? "This is mandatory." : ""]
//           [deadline ? "Complete by " + formatted_date + "." : ""]'
//     entity_type: 'training_module', entity_id: moduleId
//   - INSERT training_log entries: action = 'trainee_assigned' for each assignee
//   - INSERT audit_log entries
//   - Notify ALL QA Managers: pulse type = 'training_assigned' (system notification)
//     body: '[creator name] assigned [N] trainees to "[module title]"'
//   - Return { success: true, assigned: number }
```

#### `createQuestionnaire(data)`

```typescript
// data: { moduleId, title, description?, passingScore }
// Validation: session, is_active, role = manager, creator OR qa_manager
// Action: INSERT training_questionnaires with status = 'draft', version = 1
// INSERT training_log: action = 'questionnaire_created'
// Return { success: true, questionnaireId: string }
```

#### `publishQuestionnaire(questionnaireId)`

```typescript
// Validation:
//   - Session + is_active, creator OR qa_manager
//   - Questionnaire must have at least 3 questions before publishing
//   - LOCK: once published, this questionnaire cannot be edited
//     (the server action simply checks status = 'draft' and rejects if already published)
// Action:
//   - UPDATE training_questionnaires SET status = 'published'
//   - INSERT training_log: action = 'questionnaire_published'
//   - Return { success: true }
```

#### `startAttempt(questionnaireId, moduleId)`

```typescript
// Validation:
//   - Session + is_active
//   - User must be assigned to the module
//   - Module must be published
//   - Questionnaire must be published
//   - No existing submitted attempt for this (questionnaire_id, user_id, version) combination
// Action:
//   - INSERT training_attempts with started_at = now(), submitted_at = null
//   - UPDATE training_assignments SET status = 'in_progress' WHERE assignee_id = user AND module_id = moduleId
//   - INSERT training_log: action = 'training_started'
//   - Return { success: true, attemptId: string }
```

#### `submitAttempt(attemptId, answers[])`

```typescript
// answers: Array<{ questionId: string, answerValue: string }>
// Validation:
//   - Session + is_active
//   - Attempt must belong to auth.uid()
//   - Attempt must not already be submitted (submitted_at IS NULL)
//   - All question IDs must belong to the questionnaire
// Scoring logic:
//   - For each answer, fetch the question and its correct options
//   - multiple_choice / true_false: is_correct = (answer matches the correct option id)
//   - short_answer / fill_blank: is_correct = null (not auto-marked)
//   - Score = (correctly answered MC + TF questions) / (total MC + TF questions) * 100
//   - passed = score >= questionnaire.passing_score
// Action:
//   - INSERT training_answers for each answer
//   - UPDATE training_attempts SET submitted_at = now(), score = score, passed = passed
//   - UPDATE training_assignments SET status = 'completed', completed_at = now()
//   - INSERT training_log: action = 'attempt_submitted'
//   - INSERT audit_log: action = 'training_completed'
//   - Notify module creator via pulse: type = 'training_completed'
//     title: 'Training Completed'
//     body: '[trainee name] completed "[module title]". Score: [score]%. [passed ? "PASSED" : "DID NOT PASS"]'
//   - Notify ALL QA Managers via pulse: same content (one row per QA Manager, recipient_id set)
//   - Return { success: true, score: number, passed: boolean }
```

#### `recordPaperCompletion(data)`

```typescript
// data: { moduleId, respondentId, questionnaireId, paperScanUrl? }
// Validation:
//   - Session + is_active
//   - Caller must be module creator OR qa_manager (only they can record paper completions)
//   - respondentId must be an assignee of the module
// Action:
//   - INSERT training_attempts with completion_method = 'paper_recorded',
//     submitted_at = now(), paper_scan_url = paperScanUrl
//   - UPDATE training_assignments SET status = 'completed', completed_at = now()
//   - INSERT training_log: action = 'paper_completion_recorded'
//   - Notify QA Managers via pulse
//   - Return { success: true }
```

#### `updateSlide(moduleId, slideId, updates)`

```typescript
// updates: { title?: string, body?: string, notes?: string }
// Validation:
//   - Session + is_active
//   - Caller must be module creator OR qa_manager
//   - Module must not be archived
// Action:
//   - Fetch current slide_deck from training_modules
//   - Find the slide by id and apply updates
//   - UPDATE training_modules SET slide_deck = updatedDeck
//   - Return { success: true }
// Note: this allows text editing of generated slides. Does not change slide type or order.
```

---

## PAGES AND ROUTING

### New routes

```
app/(dashboard)/training/
├── page.tsx                              ← Manager training hub (Manager/QA only)
├── training-client.tsx                   ← Client component for hub
├── loading.tsx                           ← Skeleton
├── error.tsx                             ← Error boundary
├── [id]/
│   ├── page.tsx                          ← Module detail / editor
│   ├── module-detail-client.tsx          ← Client component
│   ├── loading.tsx
│   └── error.tsx
└── my-training/
    ├── page.tsx                          ← Trainee view (all authenticated users)
    ├── my-training-client.tsx
    └── loading.tsx

app/(dashboard)/training/[id]/questionnaire/[qid]/
├── page.tsx                              ← Digital questionnaire taking page
└── questionnaire-client.tsx
```

### Route access rules

`/training` — Managers and QA Managers only. Employees who navigate here are redirected to `/training/my-training`. Enforce in the server component (not middleware — the redirect is role-based, not auth-based).

`/training/[id]` — Module creator + QA Managers + Admins. Assignees are redirected to the questionnaire or "My Training" view.

`/training/my-training` — All authenticated active users. Shows only their own assignments.

`/training/[id]/questionnaire/[qid]` — Assigned trainees only. Enforced in server component: check assignment exists for auth.uid().

---

## COMPONENTS

### `/components/training/training-hub-client.tsx`

The main training management page for Managers and QA Managers.

**Page header:**
```
"Training" display heading
[QA Manager: show dept filter dropdown — "All Departments" or specific dept]
[All Managers: "New Module" primary button — right aligned]
```

**Stats strip (below header, 4 cards):**
- Total Modules: count of all accessible modules
- Published: count with status = 'published'
- Assigned Trainees: total unique assignees across all modules
- Completion Rate: (completed assignments / total assignments) × 100%

**Tab strip:** All | Draft | Published | Archived | Needs Review

The "Needs Review" tab shows a red badge with count — these are urgent (linked SOP was updated).

**Module cards grid (grid-cols-2 gap-4, 1 col on mobile):**

Each card:
```
┌─────────────────────────────────────────────────────┐
│ [needs_review banner if flagged — amber, full width] │
│ "SOP Updated — Regenerate training content"          │
│──────────────────────────────────────────────────────│
│ [Status pill]                    [time-ago]          │
│                                                      │
│ Module Title                                         │
│ text-16/600                                          │
│                                                      │
│ SOP-001 · v1.2 · Engineering dept badge             │
│                                                      │
│ [Mandatory badge if is_mandatory]                    │
│ [Deadline: N days remaining — amber/red if close]    │
│                                                      │
│ ── Progress ─────────────────────────────────────── │
│ [Completion bar: N/M trainees complete]              │
│ Slides: [✓ Ready | ○ Not generated]                 │
│ Questionnaires: N (N published)                      │
│                                                      │
│ [Open] [Edit] [Archive]   [Assign Trainees →]       │
└─────────────────────────────────────────────────────┘
```

Empty state per tab — appropriate message and a "Create your first training module" CTA for the All tab.

---

### `/components/training/create-module-modal.tsx`

Shadcn Dialog, max-w-lg.

**Fields:**
- Title (required, 3–120 chars)
- Description (optional, 500 chars max)
- Linked SOP (required): searchable dropdown of Active SOPs
  - Shows SOP number, title, dept badge
  - After selection: shows "Based on [SOP-001] v1.2" confirmation badge
  - Department auto-fills from the selected SOP's department
  - QA Managers can select any SOP; non-QA Managers can only select SOPs from their dept
- Department (auto-filled from SOP, read-only for non-QA, editable dropdown for QA)
- Mandatory toggle (Shadcn Switch): "Is this training mandatory?"
- Deadline date picker (optional, shown when mandatory is toggled on)

Footer: Cancel ghost + "Create Module" primary.

On success: close modal, navigate to `/training/[newModuleId]`.

---

### `/components/training/module-detail-client.tsx`

The full module editor. Three-panel layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Module header: title, SOP badge, status, needs_review flag  │
│  [Publish Module] [Archive] [Assign Trainees] buttons        │
├───────────────┬──────────────────────────┬───────────────────┤
│   Slide Deck  │   Questionnaires          │   Assignees       │
│   (left col)  │   (center col)            │   (right col)     │
└───────────────┴──────────────────────────┴───────────────────┘
```

On mobile: tabs instead of columns (Slides | Questionnaires | Assignees).

**Slide Deck panel:**
- If slide_deck is null: empty state with "Generate Slides" ShimmerButton
- If generating: spinner + "Gemini is reading the SOP and generating slides..."
- If generated: slide count badge + "Regenerate" ghost button + preview list
- Slide list: numbered, title visible, expand to see body
- Inline text editing: click a slide title or body to edit inline
- Export row: [Download .pptx] [Download PDF] — calls the export API routes
- Needs review banner: "The linked SOP has been updated. Regenerate slides to reflect the latest version."

**Questionnaires panel:**
- "New Questionnaire" button
- List of questionnaires with status badges and question counts
- Each questionnaire row: title, status pill, question count, passing score, "Edit" / "Publish" / "Generate Questions" buttons
- Expand to see question list inline (read-only preview)
- Published questionnaires: locked indicator, no edit button

**Assignees panel:**
- "Assign Trainees" button: opens `<AssignTraineesModal />`
- Completion grid (TanStack Table):
  Columns: Avatar+Name | Department | Status | Score | Completed At | Actions
  Status: colour-coded pill (not_started grey, in_progress amber, completed green)
  Score: shown only when completed
  Actions: "Record Paper Completion" button (module creator / QA only)
- Completion summary bar: "N of M trainees completed (N passed)"

---

### `/components/training/questionnaire-editor.tsx`

Opens as a Sheet (slide-in from right) when a Manager clicks Edit on a draft questionnaire.

**Header:** Questionnaire title + passing score + question count + "Generate with AI" button + "Publish Questionnaire" ShimmerButton

**AI generation section:**
- Number of questions slider: 5 to 20, step 1
- "Generate Questions" button: calls `/api/training/generate-questionnaire`
- Warning: "Generating will replace all existing questions. This cannot be undone."
- Confirm dialog before executing if questions already exist

**Question list (drag to reorder — react-beautiful-dnd or equivalent):**
Each question card:
```
[drag handle] [Q1] [question type badge]
Question text (editable inline on click)

[options list for MC/TF — edit inline]
[correct answer highlight — green background on correct option]

[sop_section_ref chip]   [Delete question button]
```

**Add question manually:**
- "Add Question" button at bottom of list
- Small form appears: question type select → question text → options (if MC/TF) → correct answer → Add

**Publish guard:** "Publish" button disabled until ≥ 3 questions exist. Tooltip: "Add at least 3 questions to publish."

---

### `/components/training/assign-trainees-modal.tsx`

Shadcn Dialog, max-w-md.

**People search:**
```typescript
// Non-QA Manager: query profiles WHERE department = user.department
//                 AND role IN ('manager', 'employee') AND is_active = true
// QA Manager: query ALL active profiles across all departments
// ENFORCE THIS IN THE SERVER ACTION TOO — not just the UI
```

Search input with debounce → results list → click to select.

Selected users shown as removable avatar chips.

"Already assigned" users are shown dimmed with a checkmark — cannot be re-selected.

Deadline display: if module has a deadline, show it in the modal: "Trainees must complete by [date]."

Footer: Cancel + "Assign [N] Trainees" primary (disabled when 0 selected).

---

### `/components/training/my-training-client.tsx`

The trainee's personal training view.

**Page header:** "My Training"

**Stats row:**
- Assigned: N modules
- Completed: N
- In Progress: N
- Overdue: N (red if > 0)

**Tab strip:** All | To Do | Completed

**Training assignment cards:**
```
┌─────────────────────────────────────────────────────┐
│ [MANDATORY badge if applicable]    [Status pill]    │
│                                                     │
│ Training Module Title                               │
│ text-16/600                                         │
│                                                     │
│ SOP-001 · v1.2 · Engineering                        │
│                                                     │
│ [Deadline: N days remaining — amber/red if close]   │
│ or [Completed: 15 Mar 2026 · Score: 85% · PASSED]  │
│                                                     │
│ [Start Training] or [Continue] or [View Results]    │
└─────────────────────────────────────────────────────┘
```

Overdue training: card has a red left border accent + "OVERDUE" badge.

---

### `/components/training/questionnaire-page-client.tsx`

The digital questionnaire taking experience. Full page, no distractions.

**Layout:** Clean, centred, max-w-2xl, no sidebar visible during questionnaire (full-screen mode — the shell is still there but the questionnaire content takes full focus).

**Header:**
- Module title + SOP badge
- Progress bar: "Question N of M"
- Timer (optional — not required, just a display if wanted)

**Question display (one question at a time on mobile, scrollable page on desktop):**

Multiple choice:
```
Q3. What is the first step when [procedure question]?

  ○ A. [option text]
  ○ B. [option text]
  ○ C. [option text]  ← selected: filled circle + bg-blue-50
  ○ D. [option text]
```

True/False:
```
Q5. [Statement here]

  ○ True
  ○ False
```

Short answer:
```
Q7. Explain the process for [task].

  ┌─────────────────────────────────────────────────┐
  │ [textarea, min 3 lines]                         │
  └─────────────────────────────────────────────────┘
```

Fill in the blank:
```
Q9. The correct sequence is: ________ then ________.

  ┌──────────────┐   ┌──────────────┐
  │ [input]      │   │ [input]      │
  └──────────────┘   └──────────────┘
```

**Navigation:** Previous / Next buttons. Questions can be revisited before submission.

**Answer review page (before final submit):**
Shows all questions and answers in a summary list. Unanswered questions highlighted in amber. "Go back to Q[N]" link next to each unanswered question.

**Submit button:** ShimmerButton "Submit Questionnaire" — requires all MC and TF questions to be answered. Short answer and fill blank can be left empty (they are not auto-marked).

**Results page (after submission):**
```
[CheckCircle or XCircle icon — 64px]

"Training Complete"  or  "Training Not Passed"

Score: 85%
Passing score: 70%
Result: PASSED / DID NOT PASS

Question breakdown:
  ✓ Q1. Correct
  ✓ Q2. Correct
  ✗ Q3. Incorrect — Correct answer: [option text]
  — Q4. Short answer (not auto-marked)
  ...

[Download Certificate]  [Back to My Training]
```

For short answer / fill blank questions in the results: show "Submitted — reviewed by trainer" label. Show the answer they gave so they can reflect on it.

---

### `/components/training/training-certificate.tsx`

Client component that generates and downloads a PDF certificate.

```
Uses jspdf.

Certificate layout:
  Top: "SOP-Guard Pro" wordmark — brand navy
  Title: "Certificate of Training Completion" — large, centred
  Body:
    "This certifies that"
    [TRAINEE FULL NAME] — large, bold
    "has successfully completed"
    [Training Module Title] — bold
    "Based on Standard Operating Procedure: [SOP Number] Version [version]"
    "Department: [department]"
    ""
    "Score Achieved: [score]%   Passing Score: [passing_score]%"
    "Completed: [formatted date]"
    "Assigned by: [Manager name]"
  Footer: "Generated by SOP-Guard Pro | [organisation name]"
  Border: thin navy border
  Bottom right: small QR code encoding the attempt_id for verification (optional)
```

---

## REPORTS INTEGRATION

### Update: `/components/reports/reports-client.tsx`

Add a "Training" section to the report selector. This is a section header (not a single report), with two sub-items beneath it:

```
─── TRAINING ───────────────
  GraduationCap  "Modules Created"     (Managers: own dept. QA/Admin: all)
  ClipboardCheck "Training Taken"      (Managers: own dept. QA/Admin: all)
```

---

### New file: `/components/reports/training-modules-report.tsx`

**Report: Training Modules Created**

Source: `training_log WHERE action = 'module_created'` joined with `training_modules` and `profiles`.

Columns: Module Title | SOP Number | Department | Created By | Status | Assignees | Completion Rate | Created At

Date range filter: applies to `created_at`.

Access: Managers see own dept. QA Managers and Admins see all.

CSV export: all columns.

Pagination: 50 rows/page, TanStack Table with server-side pagination.

---

### New file: `/components/reports/training-taken-report.tsx`

**Report: Training Taken**

Source: `training_attempts WHERE submitted_at IS NOT NULL` joined with `training_questionnaires`, `training_modules`, `profiles (respondent)`.

Columns: Trainee Name | Department | Module Title | SOP Number | SOP Version | Score | Passed | Completion Method | Submitted At

Date range filter: applies to `submitted_at`.

Access: Managers see attempts by their own dept members. QA + Admin see all.

CSV export: all columns.

Pagination: 50 rows/page.

---

## SIDEBAR INTEGRATION

### Update: `components/app-sidebar.tsx`

Add "Training" nav item between Reports and Settings.

```typescript
{
  icon: GraduationCap,  // Lucide
  label: 'Training',
  href: '/training',
}
```

**Badge logic:**
- Managers: count of their published modules with `needs_review = true` (SOP updated — action required). Badge is amber, not red (it is not urgent the way approvals are, but it is actionable).
- Employees: count of their `training_assignments` where `status = 'not_started'` AND `(deadline IS NULL OR deadline >= today)`. This tells them they have pending training.

**The "My Training" link** is accessible to all users. For Managers and QA Managers, it is a secondary link under Training (indented), not a separate nav item. For Employees, clicking Training in the sidebar goes directly to `/training/my-training` (the module management hub redirects them anyway).

---

## CRON JOB — TRAINING DEADLINES

### New file: `/api/cron/training-deadline-check/route.ts`

```typescript
// Runs daily at 8am (add to vercel.json)
// Verify: Authorization: Bearer ${CRON_SECRET}
//
// Find all training_assignments WHERE:
//   status != 'completed'
//   AND module.deadline IS NOT NULL
//   AND module.deadline = today + 7 days
//
// For each: INSERT pulse_items with type = 'training_due'
//   title: 'Training Deadline Approaching'
//   body: '"[module title]" is due in 7 days. Complete it before [deadline date].'
//   recipient_id: assignee_id
//
// Find all training_assignments WHERE:
//   status != 'completed'
//   AND module.deadline < today
//
// For each overdue assignment:
//   INSERT pulse_items: type = 'training_due'
//   title: 'Training Overdue'
//   body: '"[module title]" was due on [deadline date]. Please complete it immediately.'
//   recipient_id: assignee_id
```

Add to `vercel.json`:
```json
{ "path": "/api/cron/training-deadline-check", "schedule": "0 8 * * *" }
```

---

## PULSE ITEM RENDERERS

### Update the pulse type → renderer map

Add four new renderers:

| Type | Icon | Colour | Description |
|------|------|--------|-------------|
| `training_assigned` | GraduationCap | bg-blue-100 text-blue-600 | New training assigned to you |
| `training_due` | CalendarClock | bg-amber-100 text-amber-600 | Deadline approaching or overdue |
| `training_completed` | CheckSquare | bg-green-100 text-green-600 | A trainee completed your module |
| `training_needs_review` | AlertTriangle | bg-amber-100 text-amber-700 | SOP updated — review training content |

Each renderer shows: icon, title, body, time-ago, and "View Training →" deep link.

`training_assigned` — links to `/training/my-training`
`training_due` — links to `/training/my-training`
`training_completed` — links to `/training/[moduleId]`
`training_needs_review` — links to `/training/[moduleId]`

---

## CALENDAR INTEGRATION

Training module deadlines with `is_mandatory = true` should appear on the Company Calendar automatically — the same way PM tasks appear as teal chips.

Add to the calendar data fetch in `components/calendar/calendar-client.tsx`:

```typescript
// Fetch training deadlines for the current user
// For managers: modules they created with deadlines
// For employees: their assigned mandatory modules with deadlines
// Render as purple chips (to distinguish from PM teal chips)
// Chip label: "[module title] deadline"
// Click: shows module title, SOP ref, mandatory badge, days remaining
```

---

## DOCUMENTATION UPDATES

### Update: `/content/docs/`

Create a new section `/content/docs/training/` with these MDX files:

```
/content/docs/training/
├── 01-overview.mdx
├── 02-creating-a-module.mdx
├── 03-generating-slides.mdx
├── 04-creating-questionnaires.mdx
├── 05-assigning-trainees.mdx
├── 06-completing-training.mdx        ← Trainee guide
├── 07-viewing-results.mdx
├── 08-certificates.mdx
├── 09-training-reports.mdx
```

**Content requirements for each page:**

`01-overview.mdx` — What the Training module is, who can use it, how it connects to SOPs, the four roles in the training lifecycle (creator, assignee, QA observer, admin), the SOP-link principle.

`02-creating-a-module.mdx` — Step-by-step: clicking New Module, selecting a SOP, setting mandatory and deadline, what happens when you publish. `<RoleAccess roles={["manager","qa"]}>`

`03-generating-slides.mdx` — How AI generates slides from the SOP, what each slide type means, how to edit slides inline, how to export as .pptx or PDF, what the "SOP Updated — Regenerate" flag means and how to respond to it.

`04-creating-questionnaires.mdx` — Creating a questionnaire, AI generation, question types explained with examples, the passing score, the lock rule (cannot edit after publishing), how to create a new version if changes are needed.

`05-assigning-trainees.mdx` — Who you can assign (own dept for Managers, all depts for QA), how to set deadlines, recording paper completions, the completion grid. `<RoleAccess roles={["manager","qa"]}>`

`06-completing-training.mdx` — The trainee experience: finding assigned training in My Training, how to work through the slide deck, how to take a digital questionnaire, what the results page shows, how to download a certificate.

`07-viewing-results.mdx` — The assignees completion grid, what each status means, how to read individual scores, how to record a paper completion. `<RoleAccess roles={["manager","qa"]}>`

`08-certificates.mdx` — What a training certificate contains, how to download it, its value for compliance audits.

`09-training-reports.mdx` — The two Training reports (Modules Created, Training Taken), what each column means, how to filter by date, CSV export. `<RoleAccess roles={["manager","qa","admin"]}`

**Update the docs navigation** (`components/docs/docs-shell.tsx` or equivalent nav config):
- Add "TRAINING" as a new section in the left nav
- Place it between REPORTS and MESSAGING
- Add a `<RoleAccess>` Manager badge on the section header
- Add a `<QuickNav>` card on the home page feature grid:
  Icon: GraduationCap
  Title: "Training"
  Description: "Create AI-powered training content from SOPs, assign to your team, and track completions."
  Link: `/docs/training/overview`

---

## LOADING AND ERROR STATES

Create all of these:

```
app/(dashboard)/training/loading.tsx
  — Stats strip skeletons (4 cards)
  — Tab strip skeleton
  — 4 module card skeletons

app/(dashboard)/training/error.tsx
  — Use existing ErrorPage component

app/(dashboard)/training/[id]/loading.tsx
  — Three-column skeleton: slide list | questionnaire list | assignee table

app/(dashboard)/training/[id]/error.tsx
  — Use existing ErrorPage component

app/(dashboard)/training/my-training/loading.tsx
  — Stats row skeletons
  — 3 assignment card skeletons
```

---

## COMPLETION CHECKLIST

Run every item. Do not commit until all pass.

**Database:**
- [ ] Migration `030_training.sql` runs without errors
- [ ] All 6 tables exist with correct columns and constraints
- [ ] RLS enabled on all 6 tables
- [ ] The `flag_training_modules_on_sop_update` trigger fires when `sops.version` changes
- [ ] Test: update a SOP version manually in Supabase → training module `needs_review` flips to true
- [ ] Test: pulse_items row created for module creator on SOP version change
- [ ] Reference number trigger NOT present (training doesn't use reference numbers)
- [ ] Training log `created_at` index exists
- [ ] TypeScript types added for all 8 new interfaces
- [ ] Pulse item type CHECK constraint updated with 4 new training types

**API Routes:**
- [ ] `/api/training/generate-slides`: returns valid `TrainingSlide[]` JSON from a real SOP
- [ ] `/api/training/generate-questionnaire`: returns valid `TrainingQuestion[]` for a given count
- [ ] `/api/training/export-slides`: returns valid .pptx binary for a module with slides
- [ ] `/api/training/export-slides` PDF: returns valid PDF binary
- [ ] `/api/training/export-questionnaire`: returns print-ready PDF with no correct answers shown
- [ ] All routes return 401 without session, 403 for wrong role

**Server Actions:**
- [ ] `createTrainingModule`: validates SOP is Active, rejects if not
- [ ] `assignTrainees` — CRITICAL: non-QA Manager cannot assign users from other departments (test this explicitly)
- [ ] `assignTrainees` — QA Manager can assign users from any department
- [ ] `publishQuestionnaire`: rejects if questionnaire already published (lock enforced)
- [ ] `submitAttempt`: score calculated correctly for MC and TF questions
- [ ] `submitAttempt`: short answer questions get `is_correct = null` (not marked)
- [ ] `submitAttempt`: QA Managers notified on every completion
- [ ] `recordPaperCompletion`: only module creator or QA Manager can call this

**Security (manual tests):**
- [ ] Employee cannot access `/training` (redirected to `/training/my-training`)
- [ ] Employee cannot call `createTrainingModule` — returns 403
- [ ] Non-QA Manager cannot assign trainees from other departments — server action rejects
- [ ] Trainee cannot submit an attempt for a module they are not assigned to
- [ ] Published questionnaire questions cannot be edited (server action rejects)
- [ ] Direct DB query: Employee cannot SELECT training_modules they are not assigned to
- [ ] Direct DB query: Completed attempt cannot be modified (submitted_at already set)
- [ ] training_log: no INSERT policy for app role — all inserts via service role in server actions

**UI — Manager:**
- [ ] Module card shows needs_review banner when flagged
- [ ] Slide generation shows loading state, then slide list
- [ ] Slides are editable inline (title and body)
- [ ] .pptx download produces a working file that opens in PowerPoint
- [ ] PDF slide export produces a readable PDF
- [ ] Questionnaire editor: AI generation replaces existing questions after confirm dialog
- [ ] Questionnaire publish: disabled if fewer than 3 questions
- [ ] Published questionnaire shows locked state, no edit controls
- [ ] Assign trainees: non-QA Manager only sees own department members in search
- [ ] Assign trainees: QA Manager sees all departments in search
- [ ] Assign trainees: already-assigned users shown as dimmed with checkmark
- [ ] Completion grid shows correct status and scores for each assignee
- [ ] "Record Paper Completion" creates an attempt with completion_method = 'paper_recorded'

**UI — Trainee:**
- [ ] My Training shows only own assignments
- [ ] Overdue training shows red left border and OVERDUE badge
- [ ] Questionnaire page: all question types render correctly
- [ ] MC and TF: selecting an option highlights it
- [ ] Questionnaire: cannot submit without answering all MC and TF questions
- [ ] Results page: correct/incorrect breakdown shown for MC and TF
- [ ] Results page: short answer shown as "submitted — reviewed by trainer"
- [ ] Certificate downloads as PDF with correct name, module title, SOP ref, score
- [ ] Assignment status updates to 'completed' after successful submission

**Reports:**
- [ ] "Training" section header appears in reports selector
- [ ] Modules Created report shows correct data
- [ ] Training Taken report shows correct data
- [ ] Non-QA Manager sees only own dept data in both reports
- [ ] QA Manager sees all depts
- [ ] Date range filter works on both reports
- [ ] CSV export downloads correctly formatted file
- [ ] Both reports use server-side pagination (50 rows/page)

**Pulse:**
- [ ] `training_assigned` renders with GraduationCap icon
- [ ] `training_due` renders with CalendarClock icon
- [ ] `training_completed` renders with CheckSquare icon
- [ ] `training_needs_review` renders with AlertTriangle icon
- [ ] All four deep links navigate to correct pages

**Sidebar:**
- [ ] Training nav item appears with GraduationCap icon
- [ ] Manager badge: amber, shows count of modules with `needs_review = true`
- [ ] Employee badge: shows count of `not_started` assignments
- [ ] Badge updates without page refresh via Realtime

**Calendar:**
- [ ] Mandatory training deadlines appear as purple chips
- [ ] Chip click shows module details and days remaining

**Cron:**
- [ ] Training deadline check route returns 401 without correct secret
- [ ] 7-day warning pulse items are created correctly (test with a deadline set to today + 7)

**Documentation:**
- [ ] All 9 training doc pages created with complete content
- [ ] "TRAINING" section added to docs nav
- [ ] Training card added to docs home feature grid
- [ ] All pages use correct `<RoleAccess>` banners
- [ ] `<Callout>` components used appropriately

**Build:**
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm run build` — passes clean
- [ ] `npm run lint` — passes clean
- [ ] No console errors in browser on any training page

**Commit:** `feat: training module — ai slides, questionnaires, digital completion, certificates, reports, docs`

---

## WHAT THIS FEATURE DOES NOT BUILD

Be explicit with the agent to prevent scope creep:

- No video content hosting
- No live / scheduled training sessions
- No external trainee access (outside the organisation)
- No LMS integration (SCORM, xAPI)
- No AI marking of short answer questions
- No training prerequisite sequences or learning paths
- No in-app slide designer (Gemini generates structure, text editing only)
- No question bank / reuse across modules (each questionnaire is standalone)
- No email notifications for training events (Pulse only — email integration is separate)
- No training categories or tags (future version)
- No manager approval required to mark training complete (completion = questionnaire submitted)

---

*End of TrainingBuild.md*
*Database first. API routes second. Server actions third. Components fourth. Integration last.*
*Every checklist item must pass before committing.*

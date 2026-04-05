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

DROP TRIGGER IF EXISTS trg_flag_training_on_sop_update ON sops;

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

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'pulse_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE pulse_items DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE pulse_items ADD CONSTRAINT pulse_items_type_check
CHECK (type IN (
  'notice', 'approval_request', 'approval_update', 'cc_signature', 'cc_deadline',
  'pm_due', 'pm_overdue', 'sop_active', 'system', 'todo', 'message',
  'new_signup', 'request_update', 'training_assigned', 'training_due', 'training_completed', 'training_needs_review'
));

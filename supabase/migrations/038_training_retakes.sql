-- ═══════════════════════════════════════════════════════════════════
-- Allow retakes after a failed training attempt.
--
-- The original constraint
--   UNIQUE (questionnaire_id, respondent_id, questionnaire_version)
-- on training_attempts permitted exactly one row per user per
-- questionnaire version, which blocked the retake path even though
-- the application logic already supports it. Any second attempt — pass
-- or fail — threw a duplicate-key error.
--
-- We replace it with a PARTIAL unique index that only applies to
-- unsubmitted (in-progress) attempts. This preserves compliance
-- history (every attempt is stored) while still preventing a user
-- from ever holding two open attempts at the same time.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Drop whatever name the original inline UNIQUE constraint was given.
--    Postgres auto-generates names; looking it up by column set is
--    safer than guessing the truncated identifier.
DO $$
DECLARE
    conname text;
BEGIN
    SELECT c.conname
      INTO conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'training_attempts'
       AND c.contype = 'u'
       AND c.conkey @> (
           SELECT ARRAY(
               SELECT attnum FROM pg_attribute
                WHERE attrelid = t.oid
                  AND attname IN ('questionnaire_id','respondent_id','questionnaire_version')
           )
       );

    IF conname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE training_attempts DROP CONSTRAINT %I', conname);
    END IF;
END
$$;

-- 2. Also drop any unique index by the same column set (belt-and-braces —
--    some Supabase environments generate a separate _key index).
DROP INDEX IF EXISTS training_attempts_questionnaire_id_respondent_id_questionna_key;
DROP INDEX IF EXISTS training_attempts_questionnaire_id_respondent_id_questionn_key;

-- 3. New partial unique index: one OPEN attempt per user per version.
CREATE UNIQUE INDEX IF NOT EXISTS training_attempts_single_open_per_user
    ON training_attempts (questionnaire_id, respondent_id, questionnaire_version)
    WHERE submitted_at IS NULL;

-- 4. Index to efficiently find the latest attempt for a given user/module
--    (used by startAttempt to detect in-progress and passed attempts).
CREATE INDEX IF NOT EXISTS training_attempts_lookup_idx
    ON training_attempts (questionnaire_id, respondent_id, questionnaire_version, submitted_at);

COMMENT ON INDEX training_attempts_single_open_per_user IS
    'Prevents a user from having two simultaneous open attempts on the same questionnaire version. Submitted attempts are unconstrained so retakes are allowed.';

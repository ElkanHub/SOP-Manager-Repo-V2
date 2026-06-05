-- 046_document_control_revision_numbering.sql
-- Align SOP revision numbering with QA-SOP-007 document-control convention:
-- initial issue = 00, first revision = 01, second revision = 02.
-- Revisions always pass through Change Control; minor/significant version branching
-- is retained only as nullable legacy metadata, not as lifecycle logic.

CREATE OR REPLACE FUNCTION sop_normalize_revision(p_version text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean text;
  major int;
  minor int;
  revision int;
BEGIN
  IF p_version IS NULL OR btrim(p_version) = '' THEN
    RETURN p_version;
  END IF;

  clean := regexp_replace(lower(btrim(p_version)), '^v', '');

  IF clean ~ '^\d+$' THEN
    RETURN lpad(clean::int::text, 2, '0');
  END IF;

  IF clean ~ '^\d+\.\d+$' THEN
    major := split_part(clean, '.', 1)::int;
    minor := split_part(clean, '.', 2)::int;
    -- Legacy major/minor data had initial issue as v1.0. Normalize that
    -- lineage to 00, then count later revisions sequentially.
    revision := greatest(0, (major - 1) + minor);
    RETURN lpad(revision::text, 2, '0');
  END IF;

  RETURN p_version;
END;
$$;

CREATE OR REPLACE FUNCTION increment_sop_version(current_version text, bump_major boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  normalized text;
  current_revision int;
BEGIN
  normalized := sop_normalize_revision(current_version);

  IF normalized IS NULL OR normalized !~ '^\d+$' THEN
    current_revision := 0;
  ELSE
    current_revision := normalized::int;
  END IF;

  RETURN lpad((current_revision + 1)::text, 2, '0');
END;
$$;

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
  'new_signup', 'request_update', 'rfs_update',
  'training_assigned', 'training_due', 'training_completed', 'training_needs_review'
)) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_flag_training_on_sop_update'
      AND tgrelid = 'sops'::regclass
  ) THEN
    ALTER TABLE sops DISABLE TRIGGER trg_flag_training_on_sop_update;
  END IF;
END;
$$;

UPDATE sops
SET version = sop_normalize_revision(version)
WHERE version IS NOT NULL
  AND version <> sop_normalize_revision(version);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_flag_training_on_sop_update'
      AND tgrelid = 'sops'::regclass
  ) THEN
    ALTER TABLE sops ENABLE TRIGGER trg_flag_training_on_sop_update;
  END IF;
END;
$$;

UPDATE sop_versions
SET version = sop_normalize_revision(version)
WHERE version IS NOT NULL
  AND version <> sop_normalize_revision(version);

UPDATE change_controls
SET old_version = sop_normalize_revision(old_version),
    new_version = sop_normalize_revision(new_version)
WHERE old_version IS NOT NULL
  AND (
    old_version <> sop_normalize_revision(old_version)
    OR new_version <> sop_normalize_revision(new_version)
  );

UPDATE sop_acknowledgements
SET version = sop_normalize_revision(version)
WHERE version IS NOT NULL
  AND version <> sop_normalize_revision(version);

UPDATE training_modules
SET sop_version = sop_normalize_revision(sop_version)
WHERE sop_version IS NOT NULL
  AND sop_version <> sop_normalize_revision(sop_version);

UPDATE training_attempts
SET sop_version = sop_normalize_revision(sop_version)
WHERE sop_version IS NOT NULL
  AND sop_version <> sop_normalize_revision(sop_version);

UPDATE sops
SET revision_history = (
  SELECT COALESCE(jsonb_agg(
    item
      || jsonb_build_object(
        'old_version', CASE WHEN item ? 'old_version' THEN sop_normalize_revision(item->>'old_version') ELSE NULL END,
        'new_version', CASE WHEN item ? 'new_version' THEN sop_normalize_revision(item->>'new_version') ELSE NULL END
      )
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(revision_history, '[]'::jsonb)) item
)
WHERE revision_history IS NOT NULL
  AND revision_history <> '[]'::jsonb;

CREATE OR REPLACE FUNCTION approve_sop_request(
  p_request_id uuid,
  p_qa_user_id uuid,
  p_change_type text DEFAULT NULL,
  p_qa_note text DEFAULT NULL,
  p_requires_training boolean DEFAULT false,
  p_effective_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req sop_approval_requests%ROWTYPE;
  new_version text;
  new_cc_id uuid;
  old_version text;
  old_file_url text;
  training_deadline date;
BEGIN
  SELECT * INTO req FROM sop_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;

  IF req.approval_stage <> 'qa_review' THEN
    RAISE EXCEPTION 'This request must be endorsed by HOD before QA approval';
  END IF;

  IF req.submitted_by = p_qa_user_id THEN
    RAISE EXCEPTION 'QA Manager cannot approve their own submission';
  END IF;

  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve SOP requests';
  END IF;

  UPDATE sop_approval_requests
  SET status = 'approved',
      change_type = NULL,
      updated_at = now()
  WHERE id = p_request_id;

  IF p_qa_note IS NOT NULL THEN
    INSERT INTO sop_approval_comments (request_id, author_id, comment, action)
    VALUES (p_request_id, p_qa_user_id, p_qa_note, 'approved');
  END IF;

  training_deadline := sop_add_working_days(CURRENT_DATE, 15);

  IF req.type = 'new' THEN
    UPDATE sops
    SET version = '00',
        approved_by = p_qa_user_id,
        approved_date = CURRENT_DATE,
        training_required = p_requires_training,
        training_deadline = CASE WHEN p_requires_training THEN training_deadline ELSE NULL END,
        status = CASE WHEN p_requires_training THEN 'approved_pending_training' ELSE 'active' END,
        updated_at = now()
    WHERE id = req.sop_id;

    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    SELECT id, '00', req.file_url, req.submitted_by FROM sops WHERE id = req.sop_id
    ON CONFLICT DO NOTHING;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (p_qa_user_id, 'sop_approved_new', 'sop', req.sop_id,
      jsonb_build_object('revision', '00', 'requires_training', p_requires_training));

    IF p_requires_training THEN
      RETURN jsonb_build_object('result', 'pending_training', 'version', '00', 'training_deadline', training_deadline);
    END IF;

    PERFORM activate_sop_effective(req.sop_id, COALESCE(p_effective_date, CURRENT_DATE), p_qa_user_id, 'sop_approved_and_activated');
    RETURN jsonb_build_object('result', 'activated', 'version', '00');
  END IF;

  SELECT sop_normalize_revision(version), file_url
  INTO old_version, old_file_url
  FROM sops
  WHERE id = req.sop_id;

  new_version := increment_sop_version(old_version, false);

  INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, change_type)
  VALUES (req.sop_id, new_version, req.file_url, req.submitted_by, NULL)
  ON CONFLICT DO NOTHING;

  new_cc_id := create_change_control(
    req.sop_id, p_qa_user_id,
    old_version, new_version,
    old_file_url, req.file_url
  );

  UPDATE sops
  SET approved_by = p_qa_user_id,
      approved_date = CURRENT_DATE,
      training_required = p_requires_training,
      training_deadline = CASE WHEN p_requires_training THEN training_deadline ELSE NULL END,
      reason_for_change = COALESCE(req.reason_for_change, reason_for_change),
      updated_at = now()
  WHERE id = req.sop_id;

  PERFORM append_sop_revision_history(req.sop_id, old_version, new_version, new_cc_id, CURRENT_DATE, NULL, 'revision', p_qa_user_id, req.reason_for_change);

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_qa_user_id, 'change_control_issued', 'change_control',
    new_cc_id, jsonb_build_object('sop_id', req.sop_id, 'old_version', old_version, 'new_version', new_version, 'note', p_qa_note, 'requires_training', p_requires_training));

  RETURN jsonb_build_object('result', 'change_control_issued', 'change_control_id', new_cc_id, 'version', new_version);
END;
$$;

COMMENT ON FUNCTION increment_sop_version(text, boolean) IS
  'Returns the next two-digit GMP document revision: 00 -> 01 -> 02. bump_major is ignored for legacy compatibility.';

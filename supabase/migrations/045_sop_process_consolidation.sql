-- 045_sop_process_consolidation.sql
-- Aligns SOP lifecycle with GMP document-control requirements from v2.2 notes.

ALTER TABLE sops DROP CONSTRAINT IF EXISTS sops_status_check;
ALTER TABLE sops ADD CONSTRAINT sops_status_check CHECK (status IN (
  'draft',
  'draft_in_review',
  'pending_hod',
  'pending_qa',
  'approved_pending_training',
  'pending_cc',
  'active',
  'superseded',
  'pending_destruction',
  'destroyed'
));

ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS document_level text NOT NULL DEFAULT 'level_2'
    CHECK (document_level IN ('level_1','level_2','level_3','level_4')),
  ADD COLUMN IF NOT EXISTS approved_date date,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS revision_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reason_for_change text,
  ADD COLUMN IF NOT EXISTS training_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS training_deadline date,
  ADD COLUMN IF NOT EXISTS training_completion_threshold int NOT NULL DEFAULT 80
    CHECK (training_completion_threshold BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS retention_period_years int NOT NULL DEFAULT 3
    CHECK (retention_period_years > 0),
  ADD COLUMN IF NOT EXISTS retention_expires_at date,
  ADD COLUMN IF NOT EXISTS destruction_requested_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS destruction_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS destroyed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS destroyed_at timestamptz,
  ADD COLUMN IF NOT EXISTS destruction_justification text;

ALTER TABLE sop_approval_requests
  ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'qa_review'
    CHECK (approval_stage IN ('hod_review','qa_review')),
  ADD COLUMN IF NOT EXISTS endorsed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS endorsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reason_for_change text,
  ADD COLUMN IF NOT EXISTS cross_functional_departments text[] NOT NULL DEFAULT '{}';

ALTER TABLE change_controls DROP CONSTRAINT IF EXISTS change_controls_status_check;
ALTER TABLE change_controls ADD CONSTRAINT change_controls_status_check
  CHECK (status IN ('pending','pending_activation','complete','waived'));

ALTER TABLE change_controls
  ADD COLUMN IF NOT EXISTS reconciliation_confirmed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reconciliation_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_note text;

CREATE INDEX IF NOT EXISTS sops_document_level_idx ON sops(document_level);
CREATE INDEX IF NOT EXISTS sops_due_for_revision_idx ON sops(due_for_revision);
CREATE INDEX IF NOT EXISTS sops_retention_review_idx ON sops(status, retention_expires_at);
CREATE INDEX IF NOT EXISTS sop_approval_stage_idx ON sop_approval_requests(approval_stage, status);

CREATE OR REPLACE FUNCTION sop_add_working_days(p_start date, p_days int)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d date := p_start;
  added int := 0;
BEGIN
  WHILE added < p_days LOOP
    d := d + 1;
    IF EXTRACT(ISODOW FROM d) < 6 THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION sop_retention_expiry(p_effective_date date, p_years int)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_effective_date IS NULL THEN NULL
    ELSE (p_effective_date + ((p_years || ' years')::interval))::date
  END;
$$;

CREATE OR REPLACE FUNCTION append_sop_revision_history(
  p_sop_id uuid,
  p_old_version text,
  p_new_version text,
  p_change_control_id uuid,
  p_approval_date date,
  p_effective_date date,
  p_change_type text,
  p_actor_id uuid,
  p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE sops
  SET revision_history = COALESCE(revision_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'old_version', p_old_version,
      'new_version', p_new_version,
      'change_control_id', p_change_control_id,
      'approval_date', p_approval_date,
      'effective_date', p_effective_date,
      'change_type', p_change_type,
      'actor_id', p_actor_id,
      'reason', p_reason,
      'recorded_at', now()
    )
  )
  WHERE id = p_sop_id;
END;
$$;

CREATE OR REPLACE FUNCTION activate_sop_effective(
  p_sop_id uuid,
  p_effective_date date,
  p_actor_id uuid,
  p_audit_action text DEFAULT 'sop_effective_date_set'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sop_rec sops%ROWTYPE;
  next_due date;
  retention_due date;
BEGIN
  SELECT * INTO sop_rec FROM sops WHERE id = p_sop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOP not found';
  END IF;

  next_due := (p_effective_date + INTERVAL '3 years')::date;
  retention_due := sop_retention_expiry(p_effective_date, sop_rec.retention_period_years);

  UPDATE sops
  SET status = 'active',
      locked = false,
      effective_date = p_effective_date,
      due_for_revision = next_due,
      retention_expires_at = retention_due,
      updated_at = now()
  WHERE id = p_sop_id;

  PERFORM append_sop_revision_history(
    p_sop_id,
    NULL,
    sop_rec.version,
    NULL,
    sop_rec.approved_date,
    p_effective_date,
    NULL,
    p_actor_id,
    sop_rec.reason_for_change
  );

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, p_audit_action, 'sop', p_sop_id,
    jsonb_build_object('effective_date', p_effective_date, 'due_for_revision', next_due, 'retention_expires_at', retention_due));
END;
$$;

CREATE OR REPLACE FUNCTION create_change_control(
  p_sop_id uuid, p_qa_user_id uuid, p_old_version text,
  p_new_version text, p_old_file_url text, p_new_file_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_cc_id uuid;
  signatories jsonb;
BEGIN
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
    COALESCE(signatories, '[]'::jsonb), CURRENT_DATE + 14, p_qa_user_id
  ) RETURNING id INTO new_cc_id;

  UPDATE sops SET status = 'pending_cc', locked = true WHERE id = p_sop_id;

  RETURN new_cc_id;
END;
$$;

CREATE OR REPLACE FUNCTION approve_sop_request(
  p_request_id uuid,
  p_qa_user_id uuid,
  p_change_type text DEFAULT 'significant',
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
  v_bump_major boolean;
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
      change_type = p_change_type,
      updated_at = now()
  WHERE id = p_request_id;

  IF p_qa_note IS NOT NULL THEN
    INSERT INTO sop_approval_comments (request_id, author_id, comment, action)
    VALUES (p_request_id, p_qa_user_id, p_qa_note, 'approved');
  END IF;

  training_deadline := sop_add_working_days(CURRENT_DATE, 15);

  IF req.type = 'new' THEN
    UPDATE sops
    SET approved_by = p_qa_user_id,
        approved_date = CURRENT_DATE,
        training_required = p_requires_training,
        training_deadline = CASE WHEN p_requires_training THEN training_deadline ELSE NULL END,
        status = CASE WHEN p_requires_training THEN 'approved_pending_training' ELSE 'active' END,
        updated_at = now()
    WHERE id = req.sop_id;

    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    SELECT id, version, req.file_url, req.submitted_by FROM sops WHERE id = req.sop_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (p_qa_user_id, 'sop_approved_new', 'sop', req.sop_id,
      jsonb_build_object('requires_training', p_requires_training));

    IF p_requires_training THEN
      RETURN jsonb_build_object('result', 'pending_training', 'training_deadline', training_deadline);
    END IF;

    PERFORM activate_sop_effective(req.sop_id, COALESCE(p_effective_date, CURRENT_DATE), p_qa_user_id, 'sop_approved_and_activated');
    RETURN jsonb_build_object('result', 'activated');
  ELSE
    SELECT version, file_url INTO old_version, old_file_url FROM sops WHERE id = req.sop_id;
    v_bump_major := (p_change_type = 'significant');
    new_version := increment_sop_version(old_version, v_bump_major);

    IF p_change_type = 'minor' THEN
      UPDATE sops SET
        version = new_version,
        approved_by = p_qa_user_id,
        approved_date = CURRENT_DATE,
        training_required = p_requires_training,
        training_deadline = CASE WHEN p_requires_training THEN training_deadline ELSE NULL END,
        status = CASE WHEN p_requires_training THEN 'approved_pending_training' ELSE 'active' END,
        locked = false,
        file_url = req.file_url,
        date_revised = CURRENT_DATE,
        updated_at = now()
      WHERE id = req.sop_id;

      INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, change_type)
      VALUES (req.sop_id, new_version, req.file_url, req.submitted_by, 'minor');

      PERFORM append_sop_revision_history(req.sop_id, old_version, new_version, NULL, CURRENT_DATE, NULL, 'minor', p_qa_user_id, req.reason_for_change);

      INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
      VALUES (p_qa_user_id, 'sop_approved_minor', 'sop', req.sop_id,
        jsonb_build_object('version', new_version, 'note', p_qa_note, 'requires_training', p_requires_training));

      IF p_requires_training THEN
        RETURN jsonb_build_object('result', 'pending_training', 'version', new_version, 'training_deadline', training_deadline);
      END IF;

      PERFORM activate_sop_effective(req.sop_id, COALESCE(p_effective_date, CURRENT_DATE), p_qa_user_id, 'sop_approved_minor_activated');

      INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
      SELECT p_qa_user_id, 'sop_active',
        'SOP Updated (Minor): ' || s.title,
        'Version ' || new_version || ' is now active.',
        'sop', s.id, 'department', s.department
      FROM sops s WHERE s.id = req.sop_id;

      RETURN jsonb_build_object('result', 'activated', 'version', new_version);
    ELSE
      INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, change_type)
      VALUES (req.sop_id, new_version, req.file_url, req.submitted_by, 'significant');

      new_cc_id := create_change_control(
        req.sop_id, p_qa_user_id,
        old_version, new_version,
        old_file_url, req.file_url
      );

      UPDATE sops
      SET version = new_version,
          approved_by = p_qa_user_id,
          approved_date = CURRENT_DATE,
          training_required = p_requires_training,
          training_deadline = CASE WHEN p_requires_training THEN training_deadline ELSE NULL END,
          updated_at = now()
      WHERE id = req.sop_id;

      PERFORM append_sop_revision_history(req.sop_id, old_version, new_version, new_cc_id, CURRENT_DATE, NULL, 'significant', p_qa_user_id, req.reason_for_change);

      INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
      VALUES (p_qa_user_id, 'change_control_issued', 'change_control',
        new_cc_id, jsonb_build_object('sop_id', req.sop_id, 'new_version', new_version, 'change_type', 'significant', 'note', p_qa_note, 'requires_training', p_requires_training));

      RETURN jsonb_build_object('result', 'change_control_issued', 'change_control_id', new_cc_id, 'version', new_version);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_cc_completion(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc change_controls%ROWTYPE;
  signatory jsonb;
  all_signed boolean := true;
  sig_exists boolean;
BEGIN
  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF cc.status IN ('complete','pending_activation') THEN RETURN; END IF;

  FOR signatory IN SELECT * FROM jsonb_array_elements(cc.required_signatories) LOOP
    IF COALESCE((signatory->>'waived')::boolean, false) = false THEN
      SELECT EXISTS (
        SELECT 1 FROM signature_certificates
        WHERE change_control_id = p_cc_id AND user_id = (signatory->>'user_id')::uuid
      ) INTO sig_exists;
      IF NOT sig_exists THEN all_signed := false; EXIT; END IF;
    END IF;
  END LOOP;

  IF all_signed THEN
    UPDATE change_controls SET status = 'pending_activation', completed_at = now() WHERE id = p_cc_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (NULL, 'change_control_signatures_completed', 'change_control', p_cc_id);

    INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
    SELECT NULL, 'cc_deadline',
      'Copy reconciliation required: ' || s.title,
      'All signatures are complete. QA must confirm issued copies of ' || cc.old_version || ' are reconciled before activation.',
      'change_control', p_cc_id, 'department', s.department
    FROM sops s WHERE s.id = cc.sop_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_cc_reconciliation(
  p_cc_id uuid,
  p_actor_id uuid,
  p_note text DEFAULT NULL,
  p_effective_date date DEFAULT CURRENT_DATE
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc change_controls%ROWTYPE;
  sop_rec sops%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can confirm reconciliation';
  END IF;

  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status <> 'pending_activation' THEN
    RAISE EXCEPTION 'Change Control is not ready for reconciliation confirmation';
  END IF;

  SELECT * INTO sop_rec FROM sops WHERE id = cc.sop_id;

  UPDATE change_controls
  SET status = 'complete',
      reconciliation_confirmed_by = p_actor_id,
      reconciliation_confirmed_at = now(),
      reconciliation_note = p_note,
      completed_at = COALESCE(completed_at, now())
  WHERE id = p_cc_id;

  UPDATE sops
  SET version = cc.new_version,
      file_url = cc.new_file_url,
      date_revised = CURRENT_DATE,
      status = CASE WHEN training_required THEN 'approved_pending_training' ELSE 'active' END,
      locked = false,
      updated_at = now()
  WHERE id = cc.sop_id;

  IF NOT COALESCE(sop_rec.training_required, false) THEN
    PERFORM activate_sop_effective(cc.sop_id, COALESCE(p_effective_date, CURRENT_DATE), p_actor_id, 'change_control_reconciled_and_activated');
  END IF;

  UPDATE sops
  SET revision_history = (
    SELECT jsonb_agg(
      CASE
        WHEN item->>'change_control_id' = p_cc_id::text
        THEN item || jsonb_build_object('effective_date', CASE WHEN COALESCE(sop_rec.training_required, false) THEN NULL ELSE COALESCE(p_effective_date, CURRENT_DATE) END)
        ELSE item
      END
    )
    FROM jsonb_array_elements(COALESCE(revision_history, '[]'::jsonb)) item
  )
  WHERE id = cc.sop_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'cc_reconciliation_confirmed', 'change_control', p_cc_id,
    jsonb_build_object('sop_id', cc.sop_id, 'old_version', cc.old_version, 'new_version', cc.new_version, 'note', p_note));

  INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
  SELECT p_actor_id, 'sop_active',
    CASE WHEN s.training_required THEN 'SOP approved pending training: ' || s.title ELSE 'SOP Updated: ' || s.title END,
    CASE WHEN s.training_required THEN 'Version ' || cc.new_version || ' is reconciled and awaits training completion.' ELSE 'Version ' || cc.new_version || ' is now active.' END,
    'sop', cc.sop_id, 'department', s.department
  FROM sops s WHERE s.id = cc.sop_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_sop_pending_destruction(
  p_sop_id uuid,
  p_actor_id uuid,
  p_justification text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can start destruction review';
  END IF;

  UPDATE sops
  SET status = 'pending_destruction',
      destruction_requested_by = p_actor_id,
      destruction_requested_at = now(),
      destruction_justification = p_justification,
      updated_at = now()
  WHERE id = p_sop_id
    AND status = 'superseded';

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'sop_pending_destruction', 'sop', p_sop_id,
    jsonb_build_object('justification', p_justification));
END;
$$;

CREATE OR REPLACE FUNCTION destroy_sop_record(
  p_sop_id uuid,
  p_actor_id uuid,
  p_justification text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can destroy retained records';
  END IF;

  UPDATE sops
  SET status = 'destroyed',
      destroyed_by = p_actor_id,
      destroyed_at = now(),
      destruction_justification = p_justification,
      updated_at = now()
  WHERE id = p_sop_id
    AND status = 'pending_destruction';

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'sop_destroyed', 'sop', p_sop_id,
    jsonb_build_object('justification', p_justification));
END;
$$;

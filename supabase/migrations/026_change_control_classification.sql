-- 026_change_control_classification.sql
-- Implements Minor vs Significant change classification for SOP updates.

-- 1. Add change_type column to sop_approval_requests
ALTER TABLE sop_approval_requests 
ADD COLUMN IF NOT EXISTS change_type text CHECK (change_type IN ('minor', 'significant'));

ALTER TABLE sop_versions
ADD COLUMN IF NOT EXISTS change_type text CHECK (change_type IN ('minor', 'significant'));

-- 2. Update approve_sop_request to handle categorization
CREATE OR REPLACE FUNCTION approve_sop_request(
  p_request_id uuid, 
  p_qa_user_id uuid, 
  p_change_type text DEFAULT 'significant',
  p_qa_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req sop_approval_requests%ROWTYPE;
  new_version text;
  new_cc_id uuid;
  old_version text;
  old_file_url text;
  v_bump_major boolean;
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

  -- Update request with decision
  UPDATE sop_approval_requests 
  SET status = 'approved', 
      change_type = p_change_type,
      updated_at = now() 
  WHERE id = p_request_id;

  -- Record QA note in comments if provided
  IF p_qa_note IS NOT NULL THEN
    INSERT INTO sop_approval_comments (request_id, author_id, comment, action)
    VALUES (p_request_id, p_qa_user_id, p_qa_note, 'approved');
  END IF;

  IF req.type = 'new' THEN
    -- New SOPs are always v1.0, active immediately
    UPDATE sops SET status = 'active', approved_by = p_qa_user_id, updated_at = now()
    WHERE id = req.sop_id;

    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    SELECT id, version, req.file_url, req.submitted_by FROM sops WHERE id = req.sop_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (p_qa_user_id, 'sop_approved_new', 'sop', req.sop_id);

    RETURN jsonb_build_object('result', 'activated');
  ELSE
    -- type = 'update': branch based on change_type
    SELECT version, file_url INTO old_version, old_file_url FROM sops WHERE id = req.sop_id;
    
    v_bump_major := (p_change_type = 'significant');
    new_version := increment_sop_version(old_version, v_bump_major);

    IF p_change_type = 'minor' THEN
      -- MINOR CHANGE: Activate immediately, no Change Control
      UPDATE sops SET 
        version = new_version,
        status = 'active', 
        locked = false,
        file_url = req.file_url,
        date_revised = CURRENT_DATE,
        updated_at = now() 
      WHERE id = req.sop_id;

      INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, change_type)
      VALUES (req.sop_id, new_version, req.file_url, req.submitted_by, 'minor');

      INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
      VALUES (p_qa_user_id, 'sop_approved_minor', 'sop', req.sop_id, 
        jsonb_build_object('version', new_version, 'note', p_qa_note));

      -- Fan out sop_active pulse to all dept employees (similar to check_cc_completion)
      INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
      SELECT p_qa_user_id, 'sop_active',
        'SOP Updated (Minor): ' || s.title,
        'Version ' || new_version || ' is now active.',
        'sop', s.id, 'department', s.department
      FROM sops s WHERE s.id = req.sop_id;

      RETURN jsonb_build_object('result', 'activated', 'version', new_version);

    ELSE
      -- SIGNIFICANT CHANGE: Issue Change Control (existing behavior)
      -- Insert the new sop_versions row as draft
      INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, change_type)
      VALUES (req.sop_id, new_version, req.file_url, req.submitted_by, 'significant');

      -- Create the CC
      new_cc_id := create_change_control(
        req.sop_id, p_qa_user_id,
        old_version, new_version,
        old_file_url, req.file_url
      );

      UPDATE sops SET version = new_version, updated_at = now() WHERE id = req.sop_id;

      INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
      VALUES (p_qa_user_id, 'change_control_issued', 'change_control',
        new_cc_id, jsonb_build_object('sop_id', req.sop_id, 'new_version', new_version, 'change_type', 'significant', 'note', p_qa_note));

      RETURN jsonb_build_object('result', 'change_control_issued', 'change_control_id', new_cc_id, 'version', new_version);
    END IF;
  END IF;
END;
$$;

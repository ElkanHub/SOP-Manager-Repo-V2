-- Hotfix: approve_sop_request had a broken INSERT for sop_versions
-- The original SELECT clause returned 3 columns for a 4-column INSERT target.
-- Fixed by explicitly selecting sop_id, version, file_url, and uploaded_by.

CREATE OR REPLACE FUNCTION approve_sop_request(p_request_id uuid, p_qa_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req sop_approval_requests%ROWTYPE;
  new_version text;
  new_cc_id uuid;
  old_version text;
  old_file_url text;
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

    -- FIX: explicitly provide all 4 target columns by selecting sop_id too
    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    SELECT id, version, req.file_url, req.submitted_by FROM sops WHERE id = req.sop_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (p_qa_user_id, 'sop_approved_new', 'sop', req.sop_id);

    RETURN jsonb_build_object('result', 'activated');
  ELSE
    -- type = 'update': get current version/file, compute new version, create CC
    SELECT version, file_url INTO old_version, old_file_url FROM sops WHERE id = req.sop_id;
    new_version := increment_sop_version(old_version, false);

    -- Insert the new sop_versions row as draft
    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by)
    VALUES (req.sop_id, new_version, req.file_url, req.submitted_by);

    -- Create the CC (snapshots signatories), passing the OLD version/file and new version/file
    new_cc_id := create_change_control(
      req.sop_id, p_qa_user_id,
      old_version, new_version,
      old_file_url, req.file_url
    );

    UPDATE sops SET version = new_version, updated_at = now() WHERE id = req.sop_id;

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
    VALUES (p_qa_user_id, 'change_control_issued', 'change_control',
      new_cc_id, jsonb_build_object('sop_id', req.sop_id, 'new_version', new_version));

    RETURN jsonb_build_object('result', 'change_control_issued', 'change_control_id', new_cc_id);
  END IF;
END;
$$;

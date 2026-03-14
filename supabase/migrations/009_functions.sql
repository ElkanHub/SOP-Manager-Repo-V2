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

CREATE OR REPLACE FUNCTION approve_equipment(p_equipment_id uuid, p_qa_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  eq equipment%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve equipment';
  END IF;

  SELECT * INTO eq FROM equipment WHERE id = p_equipment_id;

  UPDATE equipment SET status = 'active', approved_by = p_qa_user_id, updated_at = now()
  WHERE id = p_equipment_id;

  -- Create first pm task
  IF eq.frequency IS NOT NULL THEN
    INSERT INTO pm_tasks (equipment_id, assigned_to, due_date)
    VALUES (eq.id, eq.submitted_by, calculate_next_due(CURRENT_DATE, eq.frequency, eq.custom_interval_days));
  END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'equipment_approved', 'equipment', p_equipment_id);
END;
$$;

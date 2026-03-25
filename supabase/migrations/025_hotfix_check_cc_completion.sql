-- 025_hotfix_check_cc_completion.sql
-- Fixes a critical omission where the `check_cc_completion` RPC activated the new Change Control
-- but failed to increment the `version` on the main `sops` table, leaving it stuck at the old version.
-- Also improves the `waived` boolean cast check for robustness.

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
    IF COALESCE((signatory->>'waived')::boolean, false) = false THEN
      SELECT EXISTS (
        SELECT 1 FROM signature_certificates
        WHERE change_control_id = p_cc_id AND user_id = (signatory->>'user_id')::uuid
      ) INTO sig_exists;
      IF NOT sig_exists THEN all_signed := false; EXIT; END IF;
    END IF;
  END LOOP;

  IF all_signed THEN
    UPDATE change_controls SET status = 'complete', completed_at = now() WHERE id = p_cc_id;
    
    -- Activate new version, supersede old AND update version string
    UPDATE sops 
    SET status = 'active', 
        locked = false, 
        version = cc.new_version,
        date_revised = CURRENT_DATE,
        file_url = cc.new_file_url, 
        updated_at = now() 
    WHERE id = cc.sop_id;
    
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

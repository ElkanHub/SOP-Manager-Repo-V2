-- Migration 015: Update complete_pm_task to accept photo_url

-- Update the complete_pm_task function to accept and store photo_url
CREATE OR REPLACE FUNCTION complete_pm_task(p_task_id uuid, p_user_id uuid, p_notes text, p_photo_url text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  task pm_tasks%ROWTYPE;
  eq   equipment%ROWTYPE;
  next_due_date date;
BEGIN
  SELECT * INTO task FROM pm_tasks WHERE id = p_task_id;
  SELECT * INTO eq FROM equipment WHERE id = task.equipment_id;

  UPDATE pm_tasks SET status = 'complete', completed_by = p_user_id,
    completed_at = now(), notes = p_notes, photo_url = p_photo_url WHERE id = p_task_id;

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

-- ─── PM Scheduling Fix ──────────────────────────────────────────────────────
-- 1. Redefine complete_pm_task to use scheduled due_date as base (prevents drift)
CREATE OR REPLACE FUNCTION complete_pm_task(p_task_id uuid, p_user_id uuid, p_notes text, p_photo_url text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  task pm_tasks%ROWTYPE;
  eq   equipment%ROWTYPE;
  next_due_date date;
BEGIN
  SELECT * INTO task FROM pm_tasks WHERE id = p_task_id;
  SELECT * INTO eq FROM equipment WHERE id = task.equipment_id;

  IF task.status = 'complete' THEN
    RAISE EXCEPTION 'This task has already been completed.';
  END IF;

  UPDATE pm_tasks SET 
    status = 'complete', 
    completed_by = p_user_id,
    completed_at = now(), 
    notes = p_notes,
    photo_url = p_photo_url
  WHERE id = p_task_id;

  -- CALCULATE NEXT DUE FROM THE ORIGINAL DUE DATE (INTERVAL-BASED)
  -- This prevents "drift" if the PM is completed early or late.
  next_due_date := calculate_next_due(task.due_date, eq.frequency, eq.custom_interval_days);

  -- CREATE NEXT TASK
  INSERT INTO pm_tasks (equipment_id, assigned_to, due_date)
  VALUES (eq.id, task.assigned_to, next_due_date);

  -- SYNC EQUIPMENT RECORD
  UPDATE equipment SET 
    last_serviced = CURRENT_DATE, 
    next_due = next_due_date,
    updated_at = now() 
  WHERE id = eq.id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_user_id, 'pm_task_completed', 'pm_task', p_task_id);
END;
$$;

-- 2. Ensure equipment next_due is always in sync with pm_tasks
-- This trigger handles manual task creation/deletion
CREATE OR REPLACE FUNCTION sync_equipment_next_due_trigger()
RETURNS trigger AS $$
BEGIN
  UPDATE equipment
  SET next_due = (
    SELECT MIN(due_date)
    FROM pm_tasks
    WHERE equipment_id = COALESCE(NEW.equipment_id, OLD.equipment_id)
      AND status != 'complete'
  )
  WHERE id = COALESCE(NEW.equipment_id, OLD.equipment_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pm_task_change
AFTER INSERT OR UPDATE OR DELETE ON pm_tasks
FOR EACH ROW EXECUTE PROCEDURE sync_equipment_next_due_trigger();

-- 3. Audit calculate_next_due (no changes needed but ensuring it handles NULLs)
-- (Existing function in 009_functions.sql is adequate, but we ensure it's robust)

-- 4. Initial Task FIX
-- If equipment is approved, the first task should be based on its 'last_serviced' date 
-- NOT CURRENT_DATE, if last_serviced was provided.
CREATE OR REPLACE FUNCTION approve_equipment(p_equipment_id uuid, p_qa_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  eq equipment%ROWTYPE;
  first_due date;
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve equipment';
  END IF;

  SELECT * INTO eq FROM equipment WHERE id = p_equipment_id;

  UPDATE equipment SET status = 'active', approved_by = p_qa_user_id, updated_at = now()
  WHERE id = p_equipment_id;

  -- Create first pm task
  IF eq.frequency IS NOT NULL THEN
    -- If they provided a last_serviced date, the first task is one interval after that.
    -- Otherwise, it's one interval from today.
    first_due := calculate_next_due(COALESCE(eq.last_serviced, CURRENT_DATE), eq.frequency, eq.custom_interval_days);
    
    INSERT INTO pm_tasks (equipment_id, assigned_to, due_date)
    VALUES (eq.id, (SELECT initial_assignee_id FROM equipment WHERE id = p_equipment_id), first_due);
  END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'equipment_approved', 'equipment', p_equipment_id);
END;
$$;

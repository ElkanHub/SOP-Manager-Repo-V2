-- ─── PM Projection Function ────────────────────────────────────────────────
-- Generates a series of future PM dates based on equipment frequency.
-- Does NOT create task records, just returns predicted dates for calendar.
CREATE OR REPLACE FUNCTION get_projected_pm_dates(p_equipment_id uuid, p_end_date date)
RETURNS TABLE (occurrence date) AS $$
DECLARE
  eq equipment%ROWTYPE;
  curr date;
  safety_count int := 0;
BEGIN
  SELECT * INTO eq FROM equipment WHERE id = p_equipment_id;
  
  -- Only project for active equipment with a set frequency
  IF eq.frequency IS NULL OR eq.status != 'active' THEN RETURN; END IF;

  -- Start from the current next_due date
  curr := eq.next_due;
  IF curr IS NULL THEN RETURN; END IF;

  WHILE curr <= p_end_date AND safety_count < 400 LOOP
    occurrence := curr;
    RETURN NEXT;
    
    -- Advance to next occurrence using existing business logic
    curr := calculate_next_due(curr, eq.frequency, eq.custom_interval_days);
    safety_count := safety_count + 1;
    
    -- Prevent infinite loops if next_due logic fails to advance
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- Batch version for efficiency
CREATE OR REPLACE FUNCTION get_all_projected_pm_dates(p_equipment_ids uuid[], p_end_date date)
RETURNS TABLE (equipment_id uuid, occurrence date) AS $$
DECLARE
  eid uuid;
BEGIN
  FOREACH eid IN ARRAY p_equipment_ids LOOP
    RETURN QUERY 
      SELECT eid, p.occurrence 
      FROM get_projected_pm_dates(eid, p_end_date) p;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;


-- 062_periodic_review.sql
-- Spec v2.2 alignment — periodic-review sign-off (gap-register #19, §11 note).
-- The system already stored due_for_revision + surfaced it on dashboards; what was
-- missing is a RECORD of a completed periodic review. This adds that record and resets
-- the next-due date from the SOP's configurable interval. Idempotent.

CREATE TABLE IF NOT EXISTS periodic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES sops(id),
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL CHECK (outcome IN ('no_change','revision_needed','retire')),
  notes text,
  next_review_date date
);

CREATE INDEX IF NOT EXISTS periodic_reviews_document_idx ON periodic_reviews(document_id);

ALTER TABLE periodic_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "periodic_reviews readable" ON periodic_reviews;
CREATE POLICY "periodic_reviews readable" ON periodic_reviews FOR SELECT USING (is_active_user(auth.uid()));
DROP POLICY IF EXISTS "periodic_reviews insertable by managers" ON periodic_reviews;
CREATE POLICY "periodic_reviews insertable by managers" ON periodic_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid() AND is_active_user(auth.uid()));

CREATE OR REPLACE FUNCTION record_periodic_review(
  p_document_id uuid, p_actor_id uuid, p_outcome text, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
  v_interval int;
  v_next date;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    -- A department manager may record a review of their own department's SOP.
    IF NOT EXISTS (
      SELECT 1 FROM sops s JOIN profiles p ON p.id = p_actor_id
      WHERE s.id = p_document_id AND p.role = 'manager' AND p.department = s.department AND p.is_active
    ) THEN
      RAISE EXCEPTION 'Only QA or the owning department manager can record a periodic review';
    END IF;
  END IF;
  IF p_outcome NOT IN ('no_change','revision_needed','retire') THEN
    RAISE EXCEPTION 'Invalid review outcome: %', p_outcome;
  END IF;

  SELECT COALESCE(periodic_review_interval_months, 36) INTO v_interval FROM sops WHERE id = p_document_id;
  v_next := (CURRENT_DATE + (v_interval || ' months')::interval)::date;

  INSERT INTO periodic_reviews (document_id, reviewer_id, outcome, notes, next_review_date)
  VALUES (p_document_id, p_actor_id, p_outcome, p_notes, v_next)
  RETURNING id INTO v_id;

  -- A 'no_change' review pushes the next-due date out; revision_needed/retire leave the
  -- due date as-is so the item stays surfaced until a CC / retirement is raised.
  IF p_outcome = 'no_change' THEN
    UPDATE sops SET due_for_revision = v_next, updated_at = now() WHERE id = p_document_id;
  END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, metadata)
  VALUES (p_actor_id, 'periodic_review_recorded', 'sop', p_document_id,
    jsonb_build_object('outcome', p_outcome),
    jsonb_build_object('next_review_date', v_next, 'notes', p_notes));

  RETURN v_id;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE periodic_reviews;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

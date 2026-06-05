-- Align Change Control with QA-SOP-007-02:
-- one numbered Change Control package can cover multiple controlled documents.

CREATE SEQUENCE IF NOT EXISTS change_control_seq START 1;

CREATE OR REPLACE FUNCTION generate_change_control_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number bigint;
BEGIN
  next_number := nextval('change_control_seq');
  RETURN 'CC/QA/' || to_char(now(), 'YYYY') || '/' || lpad(next_number::text, 4, '0');
END;
$$;

ALTER TABLE change_controls
  ADD COLUMN IF NOT EXISTS cc_number text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS originating_department text REFERENCES departments(name),
  ADD COLUMN IF NOT EXISTS rationale text,
  ADD COLUMN IF NOT EXISTS impact_assessment text,
  ADD COLUMN IF NOT EXISTS affected_departments text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qa_owner_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS screened_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS clarification_request text,
  ADD COLUMN IF NOT EXISTS clarification_requested_at timestamptz;

ALTER TABLE change_controls
  ALTER COLUMN cc_number SET DEFAULT generate_change_control_number(),
  ALTER COLUMN required_signatories SET DEFAULT '[]'::jsonb;

ALTER TABLE change_controls
  ALTER COLUMN sop_id DROP NOT NULL,
  ALTER COLUMN old_version DROP NOT NULL,
  ALTER COLUMN new_version DROP NOT NULL,
  ALTER COLUMN old_file_url DROP NOT NULL,
  ALTER COLUMN new_file_url DROP NOT NULL;

ALTER TABLE change_controls DROP CONSTRAINT IF EXISTS change_controls_status_check;
ALTER TABLE change_controls ADD CONSTRAINT change_controls_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'qa_screening',
    'clarification_requested',
    'approved_for_document_work',
    'documents_in_review',
    'signatures_pending',
    'pending_reconciliation',
    'pending_training',
    'effective',
    'closed',
    'rejected',
    'pending',
    'pending_activation',
    'complete',
    'waived'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS change_controls_cc_number_key
  ON change_controls(cc_number)
  WHERE cc_number IS NOT NULL;

UPDATE change_controls cc
SET
  cc_number = COALESCE(cc.cc_number, generate_change_control_number()),
  title = COALESCE(cc.title, 'SOP Change Control - ' || COALESCE(s.sop_number, cc.sop_id::text)),
  requester_id = COALESCE(cc.requester_id, cc.issued_by),
  originating_department = COALESCE(cc.originating_department, s.department),
  rationale = COALESCE(cc.rationale, cc.delta_summary, 'Legacy SOP revision signoff'),
  affected_departments = COALESCE(cc.affected_departments, ARRAY_REMOVE(ARRAY[s.department], NULL)),
  submitted_at = COALESCE(cc.submitted_at, cc.created_at)
FROM sops s
WHERE cc.sop_id = s.id;

UPDATE change_controls
SET
  cc_number = COALESCE(cc_number, generate_change_control_number()),
  title = COALESCE(title, 'Change Control'),
  submitted_at = COALESCE(submitted_at, created_at)
WHERE cc_number IS NULL OR title IS NULL OR submitted_at IS NULL;

CREATE TABLE IF NOT EXISTS change_control_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_control_id uuid NOT NULL REFERENCES change_controls(id) ON DELETE CASCADE,
  document_id uuid REFERENCES sops(id),
  document_number text NOT NULL,
  document_title text NOT NULL,
  document_level text NOT NULL DEFAULT 'level_2'
    CHECK (document_level IN ('level_1', 'level_2', 'level_3', 'level_4', 'level_5')),
  document_type text NOT NULL DEFAULT 'sop',
  department text REFERENCES departments(name),
  old_revision text,
  new_revision text,
  old_file_url text,
  new_file_url text,
  reason_for_change text,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'in_review', 'approved', 'changes_requested', 'rejected', 'effective')),
  training_required boolean NOT NULL DEFAULT false,
  training_deadline date,
  training_status text NOT NULL DEFAULT 'not_required'
    CHECK (training_status IN ('not_required', 'pending', 'in_progress', 'complete')),
  effective_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_control_documents_cc_idx
  ON change_control_documents(change_control_id);
CREATE INDEX IF NOT EXISTS change_control_documents_document_idx
  ON change_control_documents(document_id);
CREATE INDEX IF NOT EXISTS change_control_documents_department_idx
  ON change_control_documents(department);
CREATE UNIQUE INDEX IF NOT EXISTS change_control_documents_cc_doc_key
  ON change_control_documents(change_control_id, document_id)
  WHERE document_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_change_control_documents_updated_at ON change_control_documents;
CREATE TRIGGER trg_change_control_documents_updated_at
BEFORE UPDATE ON change_control_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO change_control_documents (
  change_control_id,
  document_id,
  document_number,
  document_title,
  document_level,
  document_type,
  department,
  old_revision,
  new_revision,
  old_file_url,
  new_file_url,
  reason_for_change,
  review_status,
  training_required,
  effective_date
)
SELECT
  cc.id,
  s.id,
  s.sop_number,
  s.title,
  COALESCE(s.document_level, 'level_2'),
  'sop',
  s.department,
  cc.old_version,
  cc.new_version,
  cc.old_file_url,
  cc.new_file_url,
  COALESCE(cc.delta_summary, cc.rationale),
  CASE WHEN cc.status IN ('complete', 'pending_activation') THEN 'approved' ELSE 'pending' END,
  COALESCE(s.requires_training, false),
  s.effective_date
FROM change_controls cc
JOIN sops s ON s.id = cc.sop_id
WHERE NOT EXISTS (
  SELECT 1
  FROM change_control_documents ccd
  WHERE ccd.change_control_id = cc.id
    AND ccd.document_id = s.id
);

ALTER TABLE change_control_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "change_control_documents viewable by related users" ON change_control_documents;
CREATE POLICY "change_control_documents viewable by related users"
ON change_control_documents FOR SELECT
USING (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM change_controls cc
      WHERE cc.id = change_control_documents.change_control_id
        AND cc.requester_id = auth.uid()
    )
    OR department = (
      SELECT p.department FROM profiles p
      WHERE p.id = auth.uid() AND p.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "change_control_documents insertable by qa or requester" ON change_control_documents;
CREATE POLICY "change_control_documents insertable by qa or requester"
ON change_control_documents FOR INSERT
WITH CHECK (
  is_active_user(auth.uid())
  AND (
    is_qa_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM change_controls cc
      WHERE cc.id = change_control_documents.change_control_id
        AND cc.requester_id = auth.uid()
        AND cc.status IN ('draft', 'submitted', 'clarification_requested')
    )
  )
);

DROP POLICY IF EXISTS "change_control_documents updatable by qa" ON change_control_documents;
CREATE POLICY "change_control_documents updatable by qa"
ON change_control_documents FOR UPDATE
USING (is_qa_manager(auth.uid()))
WITH CHECK (is_qa_manager(auth.uid()));

DROP POLICY IF EXISTS "change_controls viewable by requester" ON change_controls;
CREATE POLICY "change_controls viewable by requester"
ON change_controls FOR SELECT
USING (requester_id = auth.uid() AND is_active_user(auth.uid()));

DROP POLICY IF EXISTS "change_controls insertable by active users" ON change_controls;
CREATE POLICY "change_controls insertable by active users"
ON change_controls FOR INSERT
WITH CHECK (requester_id = auth.uid() AND is_active_user(auth.uid()));

DROP POLICY IF EXISTS "change_controls updateable by qa managers" ON change_controls;
CREATE POLICY "change_controls updateable by qa managers"
ON change_controls FOR UPDATE
USING (is_qa_manager(auth.uid()))
WITH CHECK (is_qa_manager(auth.uid()));

CREATE OR REPLACE FUNCTION create_change_control(
  p_sop_id uuid,
  p_old_version text,
  p_new_version text,
  p_old_file_url text,
  p_new_file_url text,
  p_delta_summary text,
  p_signatories jsonb,
  p_deadline timestamptz,
  p_qa_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cc_id uuid;
  v_sop sops%ROWTYPE;
BEGIN
  SELECT * INTO v_sop FROM sops WHERE id = p_sop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOP not found';
  END IF;

  INSERT INTO change_controls (
    sop_id,
    old_version,
    new_version,
    old_file_url,
    new_file_url,
    delta_summary,
    status,
    required_signatories,
    deadline,
    issued_by,
    title,
    requester_id,
    originating_department,
    rationale,
    affected_departments,
    submitted_at
  ) VALUES (
    p_sop_id,
    p_old_version,
    p_new_version,
    p_old_file_url,
    p_new_file_url,
    p_delta_summary,
    'pending',
    COALESCE(p_signatories, '[]'::jsonb),
    p_deadline,
    p_qa_user_id,
    'SOP Change Control - ' || v_sop.sop_number,
    p_qa_user_id,
    v_sop.department,
    p_delta_summary,
    ARRAY[v_sop.department],
    now()
  ) RETURNING id INTO v_cc_id;

  INSERT INTO change_control_documents (
    change_control_id,
    document_id,
    document_number,
    document_title,
    document_level,
    document_type,
    department,
    old_revision,
    new_revision,
    old_file_url,
    new_file_url,
    reason_for_change,
    training_required,
    effective_date
  ) VALUES (
    v_cc_id,
    v_sop.id,
    v_sop.sop_number,
    v_sop.title,
    COALESCE(v_sop.document_level, 'level_2'),
    'sop',
    v_sop.department,
    p_old_version,
    p_new_version,
    p_old_file_url,
    p_new_file_url,
    p_delta_summary,
    COALESCE(v_sop.requires_training, false),
    v_sop.effective_date
  );

  RETURN v_cc_id;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE change_controls;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE change_control_documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

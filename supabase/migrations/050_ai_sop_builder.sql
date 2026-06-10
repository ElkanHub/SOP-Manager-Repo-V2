-- AI SOP Builder pre-tenancy foundation.
-- Scope: guided draft generation, markdown preview, comments, template files,
-- and Word export records. Billing/tenant entitlement columns are intentionally
-- nullable or deferred so tenancy can be layered in later.

CREATE TABLE IF NOT EXISTS sop_builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NULL,
  title text NOT NULL,
  department text NULL REFERENCES departments(name),
  purpose text NOT NULL,
  objective text NULL,
  scope_text text NULL,
  intended_users text NULL,
  equipment text NULL,
  risks text NULL,
  records_forms text NULL,
  regulatory_refs text NULL,
  selected_template_id uuid NULL,
  status text NOT NULL DEFAULT 'intake'
    CHECK (status IN (
      'intake',
      'awaiting_clarification',
      'outline_ready',
      'drafting',
      'draft_ready',
      'revising',
      'word_generated',
      'completed',
      'cancelled'
    )),
  active_draft_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_builder_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sop_builder_sessions(id) ON DELETE CASCADE,
  organization_id uuid NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'agent', 'system')),
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'chat'
    CHECK (message_type IN (
      'chat',
      'clarification_question',
      'clarification_answer',
      'outline_feedback',
      'revision_instruction',
      'revision_summary',
      'system_notice'
    )),
  related_draft_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_builder_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sop_builder_sessions(id) ON DELETE CASCADE,
  organization_id uuid NULL,
  version int NOT NULL CHECK (version > 0),
  outline_json jsonb NULL,
  structured_content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  markdown_content text NOT NULL,
  docx_path text NULL,
  preview_url text NULL,
  change_summary text NULL,
  model_used text NULL,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('generating', 'ready', 'superseded', 'word_generated', 'exported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, version)
);

CREATE TABLE IF NOT EXISTS sop_builder_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sop_builder_sessions(id) ON DELETE CASCADE,
  draft_id uuid NOT NULL REFERENCES sop_builder_drafts(id) ON DELETE CASCADE,
  organization_id uuid NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  quoted_text text NULL,
  section_heading text NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolved_by_draft_id uuid NULL REFERENCES sop_builder_drafts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_builder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes int NOT NULL CHECK (file_size_bytes > 0),
  version text NULL,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_notes text NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sop_builder_templates_one_default
  ON sop_builder_templates(is_default)
  WHERE is_default = true AND status = 'active';

CREATE TABLE IF NOT EXISTS sop_builder_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sop_builder_sessions(id) ON DELETE CASCADE,
  draft_id uuid NOT NULL REFERENCES sop_builder_drafts(id) ON DELETE CASCADE,
  organization_id uuid NULL,
  exported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  export_type text NOT NULL CHECK (export_type IN ('word_generation', 'download')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sop_builder_sessions
  ADD CONSTRAINT sop_builder_sessions_active_draft_fk
  FOREIGN KEY (active_draft_id)
  REFERENCES sop_builder_drafts(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE sop_builder_sessions
  ADD CONSTRAINT sop_builder_sessions_selected_template_fk
  FOREIGN KEY (selected_template_id)
  REFERENCES sop_builder_templates(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS sop_builder_sessions_created_by_idx ON sop_builder_sessions(created_by);
CREATE INDEX IF NOT EXISTS sop_builder_sessions_status_idx ON sop_builder_sessions(status);
CREATE INDEX IF NOT EXISTS sop_builder_messages_session_idx ON sop_builder_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS sop_builder_drafts_session_idx ON sop_builder_drafts(session_id, version DESC);
CREATE INDEX IF NOT EXISTS sop_builder_comments_draft_idx ON sop_builder_comments(draft_id, status);
CREATE INDEX IF NOT EXISTS sop_builder_comments_session_idx ON sop_builder_comments(session_id, status);
CREATE INDEX IF NOT EXISTS sop_builder_templates_status_idx ON sop_builder_templates(status, is_default);
CREATE INDEX IF NOT EXISTS sop_builder_exports_session_idx ON sop_builder_exports(session_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_sop_builder_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sop_builder_sessions_updated_at ON sop_builder_sessions;
CREATE TRIGGER trg_sop_builder_sessions_updated_at
BEFORE UPDATE ON sop_builder_sessions
FOR EACH ROW EXECUTE FUNCTION set_sop_builder_updated_at();

DROP TRIGGER IF EXISTS trg_sop_builder_templates_updated_at ON sop_builder_templates;
CREATE TRIGGER trg_sop_builder_templates_updated_at
BEFORE UPDATE ON sop_builder_templates
FOR EACH ROW EXECUTE FUNCTION set_sop_builder_updated_at();

CREATE OR REPLACE FUNCTION can_use_sop_builder(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = p_user_id
      AND p.is_active = true
      AND (
        p.is_admin = true
        OR p.role = 'manager'
        OR is_qa_manager(p_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION can_manage_sop_builder_templates(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = p_user_id
      AND p.is_active = true
      AND (
        p.is_admin = true
        OR is_qa_manager(p_user_id)
      )
  );
$$;

ALTER TABLE sop_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_builder_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_builder_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_builder_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_builder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_builder_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sop_builder_sessions viewable by owner and QA" ON sop_builder_sessions;
CREATE POLICY "sop_builder_sessions viewable by owner and QA"
ON sop_builder_sessions FOR SELECT
USING (
  created_by = auth.uid()
  OR is_admin(auth.uid())
  OR is_qa_manager(auth.uid())
);

DROP POLICY IF EXISTS "sop_builder_sessions insertable by authorized users" ON sop_builder_sessions;
CREATE POLICY "sop_builder_sessions insertable by authorized users"
ON sop_builder_sessions FOR INSERT
WITH CHECK (created_by = auth.uid() AND can_use_sop_builder(auth.uid()));

DROP POLICY IF EXISTS "sop_builder_sessions updatable by owner and QA" ON sop_builder_sessions;
CREATE POLICY "sop_builder_sessions updatable by owner and QA"
ON sop_builder_sessions FOR UPDATE
USING (
  created_by = auth.uid()
  OR is_admin(auth.uid())
  OR is_qa_manager(auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR is_admin(auth.uid())
  OR is_qa_manager(auth.uid())
);

DROP POLICY IF EXISTS "sop_builder_messages viewable by session access" ON sop_builder_messages;
CREATE POLICY "sop_builder_messages viewable by session access"
ON sop_builder_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_messages insertable by session access" ON sop_builder_messages;
CREATE POLICY "sop_builder_messages insertable by session access"
ON sop_builder_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_drafts viewable by session access" ON sop_builder_drafts;
CREATE POLICY "sop_builder_drafts viewable by session access"
ON sop_builder_drafts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_drafts insertable by session access" ON sop_builder_drafts;
CREATE POLICY "sop_builder_drafts insertable by session access"
ON sop_builder_drafts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_drafts updatable by session access" ON sop_builder_drafts;
CREATE POLICY "sop_builder_drafts updatable by session access"
ON sop_builder_drafts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_comments accessible by session users" ON sop_builder_comments;
CREATE POLICY "sop_builder_comments accessible by session users"
ON sop_builder_comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_templates viewable by authorized users" ON sop_builder_templates;
CREATE POLICY "sop_builder_templates viewable by authorized users"
ON sop_builder_templates FOR SELECT
USING (can_use_sop_builder(auth.uid()));

DROP POLICY IF EXISTS "sop_builder_templates insertable by QA and admins" ON sop_builder_templates;
CREATE POLICY "sop_builder_templates insertable by QA and admins"
ON sop_builder_templates FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND can_manage_sop_builder_templates(auth.uid()));

DROP POLICY IF EXISTS "sop_builder_templates updatable by QA and admins" ON sop_builder_templates;
CREATE POLICY "sop_builder_templates updatable by QA and admins"
ON sop_builder_templates FOR UPDATE
USING (can_manage_sop_builder_templates(auth.uid()))
WITH CHECK (can_manage_sop_builder_templates(auth.uid()));

DROP POLICY IF EXISTS "sop_builder_exports viewable by session access" ON sop_builder_exports;
CREATE POLICY "sop_builder_exports viewable by session access"
ON sop_builder_exports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "sop_builder_exports insertable by session access" ON sop_builder_exports;
CREATE POLICY "sop_builder_exports insertable by session access"
ON sop_builder_exports FOR INSERT
WITH CHECK (
  exported_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM sop_builder_sessions s
    WHERE s.id = session_id
      AND (s.created_by = auth.uid() OR is_admin(auth.uid()) OR is_qa_manager(auth.uid()))
  )
);

DROP POLICY IF EXISTS "SOP Builder files are private to authorized users" ON storage.objects;
CREATE POLICY "SOP Builder files are private to authorized users"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'sop-builder'
  AND can_use_sop_builder(auth.uid())
);

DROP POLICY IF EXISTS "SOP Builder templates uploadable by QA and admins" ON storage.objects;
CREATE POLICY "SOP Builder templates uploadable by QA and admins"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'sop-builder'
  AND (storage.foldername(name))[2] = 'templates'
  AND can_manage_sop_builder_templates(auth.uid())
);

DROP POLICY IF EXISTS "SOP Builder generated files uploadable by authorized users" ON storage.objects;
CREATE POLICY "SOP Builder generated files uploadable by authorized users"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'sop-builder'
  AND can_use_sop_builder(auth.uid())
);


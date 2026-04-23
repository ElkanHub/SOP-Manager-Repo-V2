-- Inline highlight annotations for SOP approval comments.
-- A comment with quoted_text IS NOT NULL is a highlighted annotation tied to
-- a specific excerpt of the document; NULL means a plain (overall) comment.

ALTER TABLE sop_approval_comments
  ADD COLUMN IF NOT EXISTS quoted_text   text,
  ADD COLUMN IF NOT EXISTS quote_context text,
  ADD COLUMN IF NOT EXISTS anchor_hash   text;

CREATE INDEX IF NOT EXISTS sop_approval_comments_request_id_idx
  ON sop_approval_comments (request_id, created_at);

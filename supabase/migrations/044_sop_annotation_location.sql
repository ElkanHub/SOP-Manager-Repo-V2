-- Location metadata for annotated SOP approval comments so submitters can
-- locate the referenced passage in a large document.

ALTER TABLE sop_approval_comments
  ADD COLUMN IF NOT EXISTS line_number     int,
  ADD COLUMN IF NOT EXISTS char_offset     int,
  ADD COLUMN IF NOT EXISTS section_heading text;

-- Structured Level II SOP numbering.
-- Scope for this phase: Level II SOP documents only.

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS code text;

WITH base_codes AS (
  SELECT
    id,
    CASE
      WHEN lower(name) IN ('qa', 'quality assurance') THEN 'QA'
      WHEN lower(name) IN ('qc', 'quality control') THEN 'QC'
      WHEN lower(name) LIKE '%production%' THEN 'PROD'
      WHEN lower(name) LIKE '%engineering%' THEN 'ENG'
      WHEN lower(name) LIKE '%warehouse%' THEN 'WH'
      WHEN lower(name) IN ('hr', 'human resources') THEN 'HR'
      WHEN lower(name) LIKE '%maintenance%' THEN 'MNT'
      WHEN lower(name) LIKE '%regulatory%' THEN 'REG'
      ELSE COALESCE(NULLIF(left(regexp_replace(upper(name), '[^A-Z0-9]', '', 'g'), 6), ''), 'DEPT')
    END AS base_code
  FROM departments
  WHERE code IS NULL OR code = ''
),
ranked_codes AS (
  SELECT
    id,
    CASE
      WHEN row_number() OVER (PARTITION BY base_code ORDER BY id) = 1
        THEN base_code
      ELSE left(base_code, 7) || row_number() OVER (PARTITION BY base_code ORDER BY id)::text
    END AS next_code
  FROM base_codes
)
UPDATE departments d
SET code = ranked_codes.next_code
FROM ranked_codes
WHERE d.id = ranked_codes.id;

ALTER TABLE departments
  ALTER COLUMN code SET NOT NULL;

ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS departments_code_format_check;
ALTER TABLE departments
  ADD CONSTRAINT departments_code_format_check
  CHECK (code = upper(code) AND code ~ '^[A-Z0-9]{2,10}$');

CREATE UNIQUE INDEX IF NOT EXISTS departments_code_key ON departments(code);

CREATE TABLE IF NOT EXISTS document_numbering_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL DEFAULT 'SOP',
  format_template text NOT NULL DEFAULT '{DEPT}/SOP/{SEQ}',
  sequence_padding int NOT NULL DEFAULT 3 CHECK (sequence_padding BETWEEN 2 AND 8),
  sequence_scope text NOT NULL DEFAULT 'department_document_type'
    CHECK (sequence_scope IN ('department_document_type')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS document_numbering_settings_one_active_sop
  ON document_numbering_settings(document_type)
  WHERE is_active = true;

INSERT INTO document_numbering_settings (document_type, format_template, sequence_padding, sequence_scope, is_active)
VALUES ('SOP', '{DEPT}/SOP/{SEQ}', 3, 'department_document_type', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS document_number_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code text NOT NULL REFERENCES departments(code),
  document_type text NOT NULL DEFAULT 'SOP',
  last_sequence int NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_code, document_type)
);

ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS legacy_sop_number text,
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'SOP';

ALTER TABLE sops
  DROP CONSTRAINT IF EXISTS sops_document_type_check;
ALTER TABLE sops
  ADD CONSTRAINT sops_document_type_check
  CHECK (document_type IN ('SOP'));

CREATE OR REPLACE FUNCTION set_document_number_sequence_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_number_sequences_updated_at ON document_number_sequences;
CREATE TRIGGER trg_document_number_sequences_updated_at
BEFORE UPDATE ON document_number_sequences
FOR EACH ROW EXECUTE FUNCTION set_document_number_sequence_updated_at();

CREATE OR REPLACE FUNCTION render_document_number_template(
  p_template text,
  p_department_code text,
  p_document_type text,
  p_sequence int,
  p_padding int
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq_text text;
  rendered text;
BEGIN
  seq_text := lpad(p_sequence::text, p_padding, '0');
  rendered := p_template;
  rendered := replace(rendered, '{DEPT}', p_department_code);
  rendered := replace(rendered, '{TYPE}', p_document_type);
  rendered := replace(rendered, '{SEQ}', seq_text);
  rendered := replace(rendered, '{YYYY}', to_char(now(), 'YYYY'));
  rendered := replace(rendered, '{YY}', to_char(now(), 'YY'));
  RETURN rendered;
END;
$$;

CREATE OR REPLACE FUNCTION document_number_template_regex(
  p_template text,
  p_padding int
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  regex text;
BEGIN
  regex := p_template;
  regex := replace(regex, '{DEPT}', '___DEPT___');
  regex := replace(regex, '{TYPE}', '___TYPE___');
  regex := replace(regex, '{SEQ}', '___SEQ___');
  regex := replace(regex, '{YYYY}', '___YYYY___');
  regex := replace(regex, '{YY}', '___YY___');
  regex := regexp_replace(regex, '([.\+*?\[\^\]$(){}=!<>|:-])', '\\\1', 'g');
  regex := replace(regex, '___DEPT___', '[A-Z0-9]{2,10}');
  regex := replace(regex, '___TYPE___', 'SOP');
  regex := replace(regex, '___SEQ___', '[0-9]{' || p_padding::text || ',}');
  regex := replace(regex, '___YYYY___', '[0-9]{4}');
  regex := replace(regex, '___YY___', '[0-9]{2}');
  RETURN '^' || regex || '$';
END;
$$;

CREATE OR REPLACE FUNCTION is_valid_sop_number(p_sop_number text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  setting document_numbering_settings%ROWTYPE;
BEGIN
  SELECT * INTO setting
  FROM document_numbering_settings
  WHERE document_type = 'SOP' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN p_sop_number ~ '^[A-Z0-9]{2,10}/SOP/[0-9]{3,}$';
  END IF;

  RETURN upper(trim(p_sop_number)) ~ document_number_template_regex(setting.format_template, setting.sequence_padding);
END;
$$;

CREATE OR REPLACE FUNCTION preview_next_sop_number(p_department_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dept_code text;
  setting document_numbering_settings%ROWTYPE;
  last_seq int;
BEGIN
  SELECT code INTO dept_code
  FROM departments
  WHERE name = p_department_name;

  IF dept_code IS NULL THEN
    RAISE EXCEPTION 'Department code is required before creating a controlled SOP number';
  END IF;

  SELECT * INTO setting
  FROM document_numbering_settings
  WHERE document_type = 'SOP' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    setting.format_template := '{DEPT}/SOP/{SEQ}';
    setting.sequence_padding := 3;
  END IF;

  SELECT COALESCE(last_sequence, 0) INTO last_seq
  FROM document_number_sequences
  WHERE department_code = dept_code AND document_type = 'SOP';

  RETURN render_document_number_template(
    setting.format_template,
    dept_code,
    'SOP',
    COALESCE(last_seq, 0) + 1,
    setting.sequence_padding
  );
END;
$$;

CREATE OR REPLACE FUNCTION generate_next_sop_number(p_department_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dept_code text;
  setting document_numbering_settings%ROWTYPE;
  next_seq int;
BEGIN
  SELECT code INTO dept_code
  FROM departments
  WHERE name = p_department_name;

  IF dept_code IS NULL THEN
    RAISE EXCEPTION 'Department code is required before creating a controlled SOP number';
  END IF;

  SELECT * INTO setting
  FROM document_numbering_settings
  WHERE document_type = 'SOP' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    setting.format_template := '{DEPT}/SOP/{SEQ}';
    setting.sequence_padding := 3;
  END IF;

  INSERT INTO document_number_sequences (department_code, document_type, last_sequence)
  VALUES (dept_code, 'SOP', 1)
  ON CONFLICT (department_code, document_type)
  DO UPDATE SET last_sequence = document_number_sequences.last_sequence + 1
  RETURNING last_sequence INTO next_seq;

  RETURN render_document_number_template(
    setting.format_template,
    dept_code,
    'SOP',
    next_seq,
    setting.sequence_padding
  );
END;
$$;

DO $$
DECLARE
  setting document_numbering_settings%ROWTYPE;
  rec record;
BEGIN
  SELECT * INTO setting
  FROM document_numbering_settings
  WHERE document_type = 'SOP' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE sops
  SET
    legacy_sop_number = COALESCE(legacy_sop_number, sop_number),
    document_type = 'SOP'
  WHERE COALESCE(document_level, 'level_2') = 'level_2';

  UPDATE sops
  SET sop_number = '__MIGRATION__' || id::text
  WHERE COALESCE(document_level, 'level_2') = 'level_2';

  FOR rec IN
    SELECT
      s.id,
      d.code AS department_code,
      row_number() OVER (
        PARTITION BY s.department
        ORDER BY s.legacy_sop_number NULLS LAST, s.created_at, s.id
      ) AS seq
    FROM sops s
    JOIN departments d ON d.name = s.department
    WHERE COALESCE(s.document_level, 'level_2') = 'level_2'
  LOOP
    UPDATE sops
    SET sop_number = render_document_number_template(
      setting.format_template,
      rec.department_code,
      'SOP',
      rec.seq::int,
      setting.sequence_padding
    )
    WHERE id = rec.id;
  END LOOP;

  INSERT INTO document_number_sequences (department_code, document_type, last_sequence)
  SELECT
    d.code,
    'SOP',
    COUNT(s.id)::int
  FROM departments d
  LEFT JOIN sops s ON s.department = d.name AND COALESCE(s.document_level, 'level_2') = 'level_2'
  GROUP BY d.code
  ON CONFLICT (department_code, document_type)
  DO UPDATE SET last_sequence = EXCLUDED.last_sequence;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    NULL,
    'sop_numbering_migration',
    'system',
    NULL,
    jsonb_build_object(
      'scope', 'level_2_sops',
      'format_template', setting.format_template,
      'converted_count', (SELECT COUNT(*) FROM sops WHERE legacy_sop_number IS NOT NULL AND COALESCE(document_level, 'level_2') = 'level_2')
    )
  );
END $$;

CREATE OR REPLACE FUNCTION enforce_level_ii_sop_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.document_level, 'level_2') = 'level_2'
    AND COALESCE(NEW.document_type, 'SOP') = 'SOP'
    AND NOT is_valid_sop_number(NEW.sop_number)
  THEN
    RAISE EXCEPTION 'Level II SOP number must match the configured controlled format';
  END IF;

  NEW.sop_number := upper(trim(NEW.sop_number));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_level_ii_sop_number ON sops;
CREATE TRIGGER trg_enforce_level_ii_sop_number
BEFORE INSERT OR UPDATE OF sop_number, document_level, document_type ON sops
FOR EACH ROW EXECUTE FUNCTION enforce_level_ii_sop_number();

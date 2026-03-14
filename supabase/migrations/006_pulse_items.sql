CREATE TABLE pulse_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id     uuid REFERENCES profiles(id),
  sender_id        uuid REFERENCES profiles(id),
  type             text NOT NULL CHECK (type IN ('notice','approval_request','approval_update','cc_signature','cc_deadline','pm_due','pm_overdue','sop_active','system','todo','message')),
  title            text NOT NULL,
  body             text,
  entity_type      text,
  entity_id        uuid,
  parent_id        uuid REFERENCES pulse_items(id),
  audience         text NOT NULL DEFAULT 'self' CHECK (audience IN ('self','department','everyone')),
  target_department text REFERENCES departments(name),
  is_read          boolean NOT NULL DEFAULT false,
  is_acknowledged  boolean NOT NULL DEFAULT false,
  thread_depth     int NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE pulse_items ENABLE ROW LEVEL SECURITY;

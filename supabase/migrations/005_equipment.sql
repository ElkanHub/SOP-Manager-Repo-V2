CREATE TABLE equipment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              text NOT NULL UNIQUE,
  name                  text NOT NULL,
  department            text NOT NULL REFERENCES departments(name),
  secondary_departments text[] NOT NULL DEFAULT '{}',
  serial_number         text,
  model                 text,
  photo_url             text,
  linked_sop_id         uuid REFERENCES sops(id),
  frequency             text CHECK (frequency IN ('daily','weekly','monthly','quarterly','custom')),
  custom_interval_days  int,
  last_serviced         date,
  next_due              date,
  status                text NOT NULL DEFAULT 'pending_qa' CHECK (status IN ('pending_qa','active','inactive')),
  submitted_by          uuid REFERENCES profiles(id),
  approved_by           uuid REFERENCES profiles(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE pm_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id),
  assigned_to  uuid NOT NULL REFERENCES profiles(id),
  due_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','overdue')),
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  notes        text,
  photo_url    text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;

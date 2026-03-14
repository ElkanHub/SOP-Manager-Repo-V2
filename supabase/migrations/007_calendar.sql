CREATE TABLE events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  start_date  date NOT NULL,
  end_date    date,
  type        text NOT NULL DEFAULT 'manual' CHECK (type IN ('manual','pm_auto')),
  visibility  text NOT NULL DEFAULT 'department' CHECK (visibility IN ('public','department')),
  department  text REFERENCES departments(name),
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

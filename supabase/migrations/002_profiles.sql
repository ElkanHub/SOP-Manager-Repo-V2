CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name           text,
  department          text REFERENCES departments(name),
  role                text CHECK (role IN ('manager','employee')),
  is_admin            boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  employee_id         text,
  job_title           text DEFAULT '',
  phone               text,
  avatar_url          text,
  signature_url       text,
  onboarding_complete boolean NOT NULL DEFAULT false,
  notification_prefs  jsonb DEFAULT '{"email": true, "pulse": true}',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

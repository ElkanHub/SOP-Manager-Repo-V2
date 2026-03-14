CREATE TABLE sops (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_number            text NOT NULL UNIQUE,
  title                 text NOT NULL,
  department            text NOT NULL REFERENCES departments(name),
  secondary_departments text[] NOT NULL DEFAULT '{}',
  version               text NOT NULL DEFAULT 'v1.0',
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_qa','active','superseded','pending_cc')),
  locked                boolean NOT NULL DEFAULT false,
  file_url              text,
  date_listed           date DEFAULT CURRENT_DATE,
  date_revised          date,
  due_for_revision      date,
  submitted_by          uuid REFERENCES profiles(id),
  approved_by           uuid REFERENCES profiles(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;

CREATE TABLE sop_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id       uuid NOT NULL REFERENCES sops(id),
  version      text NOT NULL,
  file_url     text NOT NULL,
  diff_json    jsonb,
  delta_summary text,
  uploaded_by  uuid REFERENCES profiles(id),
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE sop_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE sop_approval_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id         uuid NOT NULL REFERENCES sops(id),
  submitted_by   uuid NOT NULL REFERENCES profiles(id),
  type           text NOT NULL CHECK (type IN ('new','update')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','changes_requested','approved','rejected')),
  file_url       text NOT NULL,
  version_label  text NOT NULL,
  notes_to_qa    text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
ALTER TABLE sop_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE sop_approval_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES sop_approval_requests(id),
  author_id   uuid NOT NULL REFERENCES profiles(id),
  comment     text NOT NULL,
  action      text CHECK (action IN ('comment','changes_requested','approved','resubmitted')),
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE sop_approval_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE sop_acknowledgements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id          uuid NOT NULL REFERENCES sops(id),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  version         text NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  UNIQUE (sop_id, user_id, version)
);
ALTER TABLE sop_acknowledgements ENABLE ROW LEVEL SECURITY;

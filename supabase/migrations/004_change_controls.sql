CREATE TABLE change_controls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id                uuid NOT NULL REFERENCES sops(id),
  old_version           text NOT NULL,
  new_version           text NOT NULL,
  old_file_url          text NOT NULL,
  new_file_url          text NOT NULL,
  diff_json             jsonb,
  delta_summary         text,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','waived')),
  required_signatories  jsonb NOT NULL,
  deadline              date NOT NULL,
  issued_by             uuid REFERENCES profiles(id),
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz
);
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;

CREATE TABLE signature_certificates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_control_id uuid NOT NULL REFERENCES change_controls(id),
  user_id           uuid NOT NULL REFERENCES profiles(id),
  signature_url     text NOT NULL,
  ip_address        text,
  signed_at         timestamptz DEFAULT now(),
  UNIQUE (change_control_id, user_id)
);
ALTER TABLE signature_certificates ENABLE ROW LEVEL SECURITY;

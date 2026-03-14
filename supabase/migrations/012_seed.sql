-- Seed QA department first (required before any users can sign up)
INSERT INTO departments (name, colour, is_qa) VALUES ('QA', 'blue', true) ON CONFLICT (name) DO NOTHING;
-- Seed test departments
INSERT INTO departments (name, colour) VALUES
  ('Engineering', 'orange'),
  ('Logistics',   'green'),
  ('Maintenance', 'purple')
ON CONFLICT (name) DO NOTHING;

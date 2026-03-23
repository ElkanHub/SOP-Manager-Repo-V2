-- Create pulse_acknowledgements table
CREATE TABLE pulse_acknowledgements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_item_id   uuid NOT NULL REFERENCES pulse_items(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz DEFAULT now(),
  UNIQUE (pulse_item_id, user_id)
);

-- Enable RLS
ALTER TABLE pulse_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view acknowledgements for items they can see" ON pulse_acknowledgements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pulse_items p
    WHERE p.id = pulse_item_id AND (
      p.recipient_id = auth.uid() OR 
      (p.audience = 'department' AND p.target_department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) OR 
      p.audience = 'everyone'
    )
  )
);

CREATE POLICY "Users can insert their own acknowledgements" ON pulse_acknowledgements FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM pulse_items p
    WHERE p.id = pulse_item_id AND (
      p.recipient_id = auth.uid() OR 
      (p.audience = 'department' AND p.target_department = (SELECT department FROM profiles WHERE id = auth.uid() AND is_active = true)) OR 
      p.audience = 'everyone'
    )
  )
);

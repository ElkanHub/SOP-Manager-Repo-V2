-- 027_pulse_realtime_and_sound_fix.sql
-- Enables real-time replication for the pulse_items table.

-- Add pulse_items and pulse_acknowledgements to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE pulse_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pulse_acknowledgements;

-- 042_pulse_todos.sql
-- Upgrade pulse todos to real, due-dated tasks that stay in The Pulse
-- until the owner marks them complete (or deletes them).
--
-- - due_at:        optional deadline. When set and past, the todo counts toward
--                  the unread badge on the handle.
-- - completed_at:  set when the owner marks the todo done. Completed todos
--                  stay visible (strikethrough) but stop counting.
--
-- Scope stays self: a todo always has sender_id = recipient_id = owner and
-- audience = 'self'. No cross-user visibility.

ALTER TABLE pulse_items ADD COLUMN IF NOT EXISTS due_at      timestamptz;
ALTER TABLE pulse_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- link_url: deep-link target rendered by PulseItem as the "View Details →"
-- affordance. Was referenced in code (training cron, pulse-item render) but
-- never actually added to the schema — fixing that here.
ALTER TABLE pulse_items ADD COLUMN IF NOT EXISTS link_url text;

-- Partial index: fast "my open todos ordered by due date"
CREATE INDEX IF NOT EXISTS pulse_items_todo_open_idx
  ON pulse_items (recipient_id, due_at NULLS LAST)
  WHERE type = 'todo' AND completed_at IS NULL;

-- DELETE policy for own todos. pulse_items has no DELETE policy today, so
-- adding one for todos only keeps the blanket lockdown for everything else.
DROP POLICY IF EXISTS "pulse_items todo deletable by owner" ON pulse_items;
CREATE POLICY "pulse_items todo deletable by owner"
  ON pulse_items FOR DELETE
  USING (
    type = 'todo'
    AND recipient_id = auth.uid()
    AND sender_id = auth.uid()
    AND audience = 'self'
  );

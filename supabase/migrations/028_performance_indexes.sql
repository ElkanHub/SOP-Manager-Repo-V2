-- Migration: 028_performance_indexes.sql
-- Adds targeted indexes for the app's most frequent queries.
-- All indexes use IF NOT EXISTS - safe to run on a live database.
-- Supabase builds indexes in the background without locking tables.

-- SOP Library (department + status is the most common filter combination)
CREATE INDEX IF NOT EXISTS sops_dept_status_idx ON sops(department, status);
CREATE INDEX IF NOT EXISTS sops_status_created_idx ON sops(status, created_at DESC);

-- Equipment Registry
CREATE INDEX IF NOT EXISTS equipment_dept_status_idx ON equipment(department, status);

-- PM Tasks (for calendar and cron jobs checking due dates)
CREATE INDEX IF NOT EXISTS pm_tasks_due_date_idx ON pm_tasks(due_date, status);
CREATE INDEX IF NOT EXISTS pm_tasks_status_completed_idx ON pm_tasks(status, completed_at DESC);

-- Audit Log (reports page - the two most common filter paths)
CREATE INDEX IF NOT EXISTS audit_log_entity_created_idx ON audit_log(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_created_idx ON audit_log(actor_id, created_at DESC);

-- Pulse Items (highest query volume in the app)
CREATE INDEX IF NOT EXISTS pulse_items_recipient_read_idx ON pulse_items(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS pulse_items_audience_dept_idx ON pulse_items(audience, target_department, created_at DESC);
CREATE INDEX IF NOT EXISTS pulse_items_type_created_idx ON pulse_items(type, created_at DESC);

-- Messages (conversation thread loading - cursor-based)
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages(conversation_id, created_at DESC);

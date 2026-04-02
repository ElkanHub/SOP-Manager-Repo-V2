-- 032_realtime_badges.sql
-- Enables real-time replication for tables used in sidebar badge counts.

ALTER PUBLICATION supabase_realtime ADD TABLE sop_approval_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;

-- document_requests was already added in 031, but just in case:
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_publication_tables 
--     WHERE pubname = 'supabase_realtime' 
--     AND schemaname = 'public' 
--     AND tablename = 'document_requests'
--   ) THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE document_requests;
--   END IF;
-- END $$;

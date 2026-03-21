-- Hotfix: Remove recursive profile SELECT policy from 019_messaging.sql
-- The policy "Profiles are viewable by any active user" from 011_rls.sql 
-- already handles this permission correctly without infinite recursion.

DROP POLICY IF EXISTS "active users can search profiles for messaging" ON profiles;

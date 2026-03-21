-- Hotfix: Prevent infinite recursion on conversation_members RLS

-- Create a security definer function to check membership safely without triggering RLS
CREATE OR REPLACE FUNCTION is_conversation_member(c_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members 
    WHERE conversation_id = c_id AND user_id = auth.uid()
  );
$$;

-- Fix conversation_members policy
DROP POLICY IF EXISTS "members can view conversation_members" ON conversation_members;
CREATE POLICY "members can view conversation_members"
ON conversation_members FOR SELECT
USING (
  is_conversation_member(conversation_id)
  AND is_active_user(auth.uid())
);

-- Fix conversations policy
DROP POLICY IF EXISTS "members can view their conversations" ON conversations;
CREATE POLICY "members can view their conversations" 
ON conversations FOR SELECT 
USING (is_conversation_member(id) AND is_active_user(auth.uid()));

-- Fix messages policy
DROP POLICY IF EXISTS "members can view messages in their conversations" ON messages;
CREATE POLICY "members can view messages in their conversations" 
ON messages FOR SELECT 
USING (is_conversation_member(conversation_id) AND is_active_user(auth.uid()));

-- Add initials_url to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS initials_url text;

-- Update storage objects policies for the 'signatures' bucket
-- Currently, policies only allow owners and non-admin managers.
-- We add an explicit check for is_admin(auth.uid()).

-- Re-doing the select policy with Admin access
DROP POLICY IF EXISTS "Signatures are viewable by owner, QA Manager and Managers in same dept" ON storage.objects;

CREATE POLICY "Signatures are viewable by owner, QA, Managers in same dept, and Admins"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'signatures' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid()::text = split_part(name, '/', 1) OR
    is_admin(auth.uid()) OR -- Explicitly allow Admins
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN departments d ON d.name = p.department
      WHERE p.id = auth.uid() AND (
        (p.role = 'manager' AND d.is_qa = true) OR 
        (p.role = 'manager' AND p.department = (SELECT department FROM profiles WHERE id::text = COALESCE((storage.foldername(name))[1], split_part(name, '/', 1))))
      )
    )
  ));

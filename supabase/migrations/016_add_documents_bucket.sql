-- Add documents bucket for SOP uploads
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Allow managers to upload SOPs
drop policy if exists "Managers can upload SOPs" on storage.objects;
create policy "Managers can upload SOPs"
  on storage.objects for insert
  with check (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'sop-uploads' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Allow QA Managers and involved managers to view documents
drop policy if exists "QA and Managers can view documents" on storage.objects;
create policy "QA and Managers can view documents"
  on storage.objects for select
  using (
    bucket_id = 'documents' AND (
      -- Is a QA Manager
      EXISTS (
        SELECT 1 FROM profiles p 
        JOIN departments d ON d.name = p.department
        WHERE p.id = auth.uid() AND p.role = 'manager' AND d.is_qa = true
      )
      OR
      -- Is the uploader
      EXISTS (
        SELECT 1 FROM sops s
        WHERE s.file_url = name AND s.submitted_by = auth.uid()
      )
      OR
      -- It is an approved SOP and user is active
      EXISTS (
        SELECT 1 FROM sops s
        JOIN profiles p ON p.id = auth.uid()
        WHERE s.file_url = name AND s.status = 'active' AND p.is_active = true
      )
    )
  );

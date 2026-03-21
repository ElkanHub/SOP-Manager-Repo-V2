insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('signatures', 'signatures', false)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly accessible" on storage.objects;
create policy "Avatars are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "Signatures are viewable by owner, QA Manager and Managers in same dept" on storage.objects;
create policy "Signatures are viewable by owner, QA Manager and Managers in same dept"
  on storage.objects for select
  using ( bucket_id = 'signatures' and (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid()::text = split_part(name, '/', 1) OR
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN departments d ON d.name = p.department
      WHERE p.id = auth.uid() AND (
        (p.role = 'manager' AND d.is_qa = true) OR 
        (p.role = 'manager' AND p.department = (SELECT department FROM profiles WHERE id::text = COALESCE((storage.foldername(name))[1], split_part(name, '/', 1))))
      )
    )
  ));

drop policy if exists "Users can upload their own signature" on storage.objects;
create policy "Users can upload their own signature"
  on storage.objects for insert
  with check ( bucket_id = 'signatures' and (
    auth.uid()::text = (storage.foldername(name))[1] or
    auth.uid()::text = split_part(name, '/', 1)
  ));

drop policy if exists "Users can update their own signature" on storage.objects;
create policy "Users can update their own signature"
  on storage.objects for update
  using ( bucket_id = 'signatures' and (
    auth.uid()::text = (storage.foldername(name))[1] or
    auth.uid()::text = split_part(name, '/', 1)
  ));

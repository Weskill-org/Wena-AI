-- Create storage bucket for profile pictures
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Allow users to upload their own avatars
create policy "Users can upload their own avatar"
on storage.objects
for insert
with check (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
create policy "Users can update their own avatar"
on storage.objects
for update
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
create policy "Users can delete their own avatar"
on storage.objects
for delete
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow everyone to view avatars (public bucket)
create policy "Anyone can view avatars"
on storage.objects
for select
using (bucket_id = 'avatars');
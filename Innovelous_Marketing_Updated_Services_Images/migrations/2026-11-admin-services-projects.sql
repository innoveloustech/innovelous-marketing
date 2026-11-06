-- Existing Supabase projects: run this once in SQL Editor before deploying.
-- Safe to rerun. Preserves all records, accounts, images and existing values.
begin;
alter table public.services add column if not exists image_url text;
alter table public.case_studies add column if not exists image_url text;
alter table public.case_studies add column if not exists project_url text;
alter table public.case_studies add column if not exists project_date date;

-- Public reads must not call the admin-only function as an anonymous visitor.
-- The existing admin-management policies continue to expose drafts to admins.
drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services" on public.services
  for select to anon, authenticated using (is_published = true);
drop policy if exists "Public can read published case studies" on public.case_studies;
create policy "Public can read published case studies" on public.case_studies
  for select to anon, authenticated using (is_published = true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
 ('service-images','service-images',true,8388608,array['image/png','image/jpeg','image/webp','image/avif']),
 ('project-images','project-images',true,8388608,array['image/png','image/jpeg','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public can view marketing service images" on storage.objects;
create policy "Public can view marketing service images" on storage.objects
  for select to anon, authenticated using (bucket_id='service-images');
drop policy if exists "Marketing admins manage service images" on storage.objects;
create policy "Marketing admins manage service images" on storage.objects
  for all to authenticated using (bucket_id='service-images' and public.is_marketing_admin())
  with check (bucket_id='service-images' and public.is_marketing_admin());
drop policy if exists "Public can view marketing project images" on storage.objects;
create policy "Public can view marketing project images" on storage.objects
  for select to anon, authenticated using (bucket_id='project-images');
drop policy if exists "Marketing admins upload project images" on storage.objects;
create policy "Marketing admins upload project images" on storage.objects
  for insert to authenticated with check (bucket_id='project-images' and public.is_marketing_admin());
drop policy if exists "Marketing admins update project images" on storage.objects;
create policy "Marketing admins update project images" on storage.objects
  for update to authenticated using (bucket_id='project-images' and public.is_marketing_admin())
  with check (bucket_id='project-images' and public.is_marketing_admin());
drop policy if exists "Marketing admins delete project images" on storage.objects;
create policy "Marketing admins delete project images" on storage.objects
  for delete to authenticated using (bucket_id='project-images' and public.is_marketing_admin());
notify pgrst, 'reload schema';
commit;

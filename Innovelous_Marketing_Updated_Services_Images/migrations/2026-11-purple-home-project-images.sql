-- Run in the existing Supabase project's SQL Editor after deploying this update.
alter table public.case_studies add column if not exists image_url text;
alter table public.case_studies add column if not exists project_url text;

update public.site_settings
set hero_eyebrow = 'DIGITAL TRANSFORMATION',
    hero_title = 'Websites that bring in customers, not just visitors.',
    hero_text = 'Web design, online stores, apps and software built to help your business grow.',
    primary_cta = 'Start Your Project',
    secondary_cta = 'View Our Work'
where id = 1;


-- Create the public image bucket. Project links remain optional.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images','project-images',true,8388608,array['image/png','image/jpeg','image/webp','image/avif'])
on conflict (id) do update set public=true, file_size_limit=8388608, allowed_mime_types=array['image/png','image/jpeg','image/webp','image/avif'];

drop policy if exists "Public can view marketing project images" on storage.objects;
create policy "Public can view marketing project images" on storage.objects for select to anon, authenticated using (bucket_id='project-images');
drop policy if exists "Marketing admins upload project images" on storage.objects;
create policy "Marketing admins upload project images" on storage.objects for insert to authenticated with check (bucket_id='project-images' and public.is_marketing_admin());
drop policy if exists "Marketing admins update project images" on storage.objects;
create policy "Marketing admins update project images" on storage.objects for update to authenticated using (bucket_id='project-images' and public.is_marketing_admin()) with check (bucket_id='project-images' and public.is_marketing_admin());
drop policy if exists "Marketing admins delete project images" on storage.objects;
create policy "Marketing admins delete project images" on storage.objects for delete to authenticated using (bucket_id='project-images' and public.is_marketing_admin());

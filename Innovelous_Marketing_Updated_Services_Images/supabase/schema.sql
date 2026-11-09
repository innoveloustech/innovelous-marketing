-- Innovelous Marketing CMS — run in the Supabase SQL Editor on a new project.
create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  hero_eyebrow text not null default 'DIGITAL TRANSFORMATION',
  hero_title text not null default 'Websites that bring in customers, not just visitors.',
  hero_text text not null default 'Web design, online stores, apps and software built to help your business grow.',
  primary_cta text not null default 'Start Your Project',
  secondary_cta text not null default 'View Our Work',
  contact_email text not null default 'hello@innovelous.com',
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
update public.site_settings set hero_eyebrow='DIGITAL TRANSFORMATION', hero_title='Websites that bring in customers, not just visitors.', hero_text='Web design, online stores, apps and software built to help your business grow.', primary_cta='Start Your Project', secondary_cta='View Our Work' where id=1;

create table if not exists public.marketing_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_marketing_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.marketing_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_marketing_admin() from public;
grant execute on function public.is_marketing_admin() to authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 70),
  summary text not null check (char_length(summary) between 1 and 240),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  category text not null default 'SELECTED WORK',
  summary text not null check (char_length(summary) between 1 and 280),
  outcome text,
  image_url text check (image_url is null or char_length(image_url) <= 500),
  project_url text check (project_url is null or char_length(project_url) <= 500),
  visual text not null default 'lilac' check (visual in ('lilac','plum','night')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_studies add column if not exists image_url text;
alter table public.case_studies add column if not exists project_url text;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 180),
  company text check (company is null or char_length(company) <= 120),
  service text check (service is null or char_length(service) <= 100),
  message text not null check (char_length(message) between 1 and 1200),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.marketing_admins enable row level security;
alter table public.services enable row level security;
alter table public.case_studies enable row level security;
alter table public.leads enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings for all to authenticated using (public.is_marketing_admin()) with check (public.is_marketing_admin());

drop policy if exists "Admins can read their own admin membership" on public.marketing_admins;
create policy "Admins can read their own admin membership" on public.marketing_admins for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services" on public.services for select to anon, authenticated using (is_published or public.is_marketing_admin());
drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services for all to authenticated using (public.is_marketing_admin()) with check (public.is_marketing_admin());

drop policy if exists "Public can read published case studies" on public.case_studies;
create policy "Public can read published case studies" on public.case_studies for select to anon, authenticated using (is_published or public.is_marketing_admin());
drop policy if exists "Admins manage case studies" on public.case_studies;
create policy "Admins manage case studies" on public.case_studies for all to authenticated using (public.is_marketing_admin()) with check (public.is_marketing_admin());

drop policy if exists "Visitors can submit enquiries" on public.leads;
create policy "Visitors can submit enquiries" on public.leads for insert to anon, authenticated with check (status = 'new');
drop policy if exists "Admins read enquiries" on public.leads;
create policy "Admins read enquiries" on public.leads for select to authenticated using (public.is_marketing_admin());
drop policy if exists "Admins update enquiries" on public.leads;
create policy "Admins update enquiries" on public.leads for update to authenticated using (public.is_marketing_admin()) with check (public.is_marketing_admin());
drop policy if exists "Admins delete enquiries" on public.leads;
create policy "Admins delete enquiries" on public.leads for delete to authenticated using (public.is_marketing_admin());

grant select on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select on public.services, public.case_studies to anon, authenticated;
grant insert, update, delete on public.services, public.case_studies to authenticated;
grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;
grant select on public.marketing_admins to authenticated;




-- After creating an admin user in Supabase Authentication, grant that user dashboard access:
-- insert into public.marketing_admins (user_id) values ('AUTH_USER_UUID');


-- Public project imagery; only authorized marketing admins can upload or manage files.
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


-- CMS image and date extension for new installations.
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

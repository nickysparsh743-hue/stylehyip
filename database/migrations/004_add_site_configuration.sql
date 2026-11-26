-- Dedicated singleton configuration for public and administrator site settings.
-- Existing tables and application data are not modified.

create table if not exists public.site_configuration (
  id smallint primary key default 1 constraint site_configuration_singleton check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_configuration enable row level security;

create policy "Public can read site configuration"
  on public.site_configuration
  for select
  using (true);

create policy "Admins can manage site configuration"
  on public.site_configuration
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  );

-- Reuse the existing public product-images bucket. Settings uploads are restricted
-- to the settings/ folder and image access remains public.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

create policy "Public can view settings images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins can upload settings images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'settings'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  );

create policy "Admins can replace settings images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'settings'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'settings'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  );

create policy "Admins can delete settings images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'settings'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.role)) = 'admin'
    )
  );

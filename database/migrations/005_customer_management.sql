-- Customer account management schema and authorization hardening.

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists account_status_reason text,
  add column if not exists account_status_until timestamptz,
  add column if not exists ban_reason text,
  add column if not exists admin_note text,
  add column if not exists last_login_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active', 'blocked', 'banned', 'pending_verification'));

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_customer_requests_pending_email
  on public.customer_requests(lower(email)) where status = 'pending';
create index if not exists idx_customer_requests_status_created on public.customer_requests(status, created_at desc);

create table if not exists public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('admin','customer')),
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','expired','failed')),
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_customer_invitations_pending_email
  on public.customer_invitations(lower(email)) where status = 'pending';
create index if not exists idx_customer_invitations_status_created on public.customer_invitations(status, created_at desc);

create table if not exists public.account_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  admin_id uuid references public.profiles(id),
  action text not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_activity_logs_created on public.account_activity_logs(created_at desc);
create index if not exists idx_account_activity_logs_action on public.account_activity_logs(action);
create index if not exists idx_account_activity_logs_admin on public.account_activity_logs(admin_id);

alter table public.customer_requests enable row level security;
alter table public.customer_invitations enable row level security;
alter table public.account_activity_logs enable row level security;

create policy "Public can submit customer requests"
  on public.customer_requests for insert to anon, authenticated
  with check (status = 'pending');

create policy "Admins can manage customer requests"
  on public.customer_requests for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'));

create policy "Admins can manage customer invitations"
  on public.customer_invitations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'));

create policy "Admins can read activity logs"
  on public.account_activity_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'));

create policy "Only trusted server writes activity logs"
  on public.account_activity_logs for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role)) = 'admin'));

-- Replace unsafe unrestricted self-update policy with a restricted profile policy.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update safe own profile fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and account_status = (select account_status from public.profiles where id = auth.uid())
  );

-- Self-profile creation is needed after invitation acceptance. Administrative fields remain excluded.
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role = 'customer'
  );

-- Automatically create a profile for new Auth users. Service-role invites can supply metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, account_status, invited_at, last_login_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    case when lower(coalesce(new.raw_user_meta_data->>'role','customer')) = 'admin' then 'admin' else 'customer' end,
    'active',
    now(),
    null
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Mark invitations accepted when matching auth users complete creation.
create or replace function public.mark_customer_invitation_accepted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.customer_invitations
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where lower(email) = lower(coalesce(new.email,'')) and status = 'pending';
  update public.profiles set account_status = 'active', updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_accept_invitation on auth.users;
create trigger on_auth_user_accept_invitation
  after insert on auth.users
  for each row execute function public.mark_customer_invitation_accepted();

create table if not exists public.inventory_migrations_marker(id boolean);

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  is_active boolean not null default true,
  invited_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price integer not null default 0,
  stock integer not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  is_featured boolean default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processing','paid','shipped','delivered','cancelled','refunded')),
  total integer not null default 0,
  delivery_address text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null default 1,
  unit_price integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mpesa',
  status text not null default 'pending',
  reference text,
  amount integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null default 5,
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  line1 text,
  city text,
  county text,
  created_at timestamptz default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  updated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  updated_at timestamptz default now()
);

create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_featured on public.products (is_featured);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_reviews_product_id on public.reviews (product_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.addresses enable row level security;
alter table public.inventory enable row level security;
alter table public.notifications enable row level security;
alter table public.customers enable row level security;
alter table public.site_settings enable row level security;

create policy "Users can read their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can manage profiles" on public.profiles for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Public can view active categories" on public.categories for select using (is_active = true);
create policy "Admins can manage categories" on public.categories for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Public can view active products" on public.products for select using (is_active = true);
create policy "Admins can manage products" on public.products for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Users can manage their own orders" on public.orders for all using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Users can manage their own order items" on public.order_items for all using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))));
create policy "Users can manage their own payments" on public.payments for all using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))));
create policy "Users can read reviews" on public.reviews for select using (true);
create policy "Users can create reviews" on public.reviews for insert with check (auth.uid() = user_id or user_id is null);
create policy "Users can manage their own addresses" on public.addresses for all using (auth.uid() = user_id);
create policy "Admins can manage inventory" on public.inventory for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Users can manage their own notifications" on public.notifications for all using (auth.uid() = user_id);
create policy "Admins can manage customers" on public.customers for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "Admins can manage site settings" on public.site_settings for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

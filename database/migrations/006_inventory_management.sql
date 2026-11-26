-- Inventory management: inventory is the authoritative stock source.

alter table public.inventory
  add column if not exists sku text,
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists updated_at timestamptz not null default now();

alter table public.inventory add constraint inventory_stock_nonnegative check (stock >= 0);
alter table public.inventory add constraint inventory_threshold_nonnegative check (low_stock_threshold >= 0);
create index if not exists idx_inventory_product_stock on public.inventory(product_id, stock);
create index if not exists idx_inventory_sku on public.inventory(lower(sku)) where sku is not null;

-- Preserve every existing products.stock value and initialize missing records.
insert into public.inventory(product_id, stock, low_stock_threshold, updated_at)
select p.id, greatest(coalesce(p.stock, 0), 0), 5, now()
from public.products p
where not exists (select 1 from public.inventory i where i.product_id = p.id)
on conflict do nothing;

update public.inventory i
set stock = greatest(coalesce(p.stock, i.stock), 0), updated_at = now()
from public.products p
where i.product_id = p.id;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null,
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text,
  reference_number text,
  order_id uuid references public.orders(id) on delete set null,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inventory_movements add constraint inventory_movements_type_check
  check (movement_type in ('stock_received','stock_removed','stock_adjustment','order_reservation','order_cancellation_restock','order_fulfillment','return_restock','threshold_update'));
create index if not exists idx_inventory_movements_product on public.inventory_movements(product_id, created_at desc);
create index if not exists idx_inventory_movements_type on public.inventory_movements(movement_type, created_at desc);
create index if not exists idx_inventory_movements_order on public.inventory_movements(order_id);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','released','expired','finalized','cancelled')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, product_id)
);
create index if not exists idx_inventory_reservations_active on public.inventory_reservations(product_id, status, expires_at);

drop table if exists public.inventory_migrations_marker;

alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_reservations enable row level security;

create policy "Admins can manage inventory"
  on public.inventory for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role))='admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role))='admin'));

create policy "Admins can read inventory movements"
  on public.inventory_movements for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role))='admin'));

create policy "Admins can read inventory reservations"
  on public.inventory_reservations for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(trim(p.role))='admin'));

-- Keep the duplicate product stock column synchronized to inventory.
create or replace function public.sync_product_stock()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.products p set stock=greatest(new.stock,0)
  where p.id=new.product_id and coalesce(p.stock,-1) <> greatest(new.stock,0);
  return new;
end;
$$;

drop trigger if exists inventory_sync_product_stock on public.inventory;
create trigger inventory_sync_product_stock
after insert or update of stock on public.inventory
for each row execute function public.sync_product_stock();

-- Also keep inventory synchronized if legacy product updates still occur.
create or replace function public.sync_inventory_stock()
returns trigger language plpgsql security definer set search_path=public as $$
declare current_stock integer;
begin
  select stock into current_stock from public.inventory where product_id=new.id;
  if current_stock is null then
    insert into public.inventory(product_id,stock,low_stock_threshold) values(new.id,greatest(new.stock,0),5);
  elsif current_stock <> greatest(new.stock,0) then
    update public.inventory set stock=greatest(new.stock,0),updated_at=now() where product_id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists product_sync_inventory_stock on public.products;
create trigger product_sync_inventory_stock
after insert or update of stock on public.products
for each row execute function public.sync_inventory_stock();

-- Alert administrators only on an actual low-stock/out-of-stock transition.
create or replace function public.inventory_stock_transition_alert()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  admin record;
  old_status text;
  new_status text;
begin
  old_status := case when old.stock <= 0 then 'out' when old.stock <= old.low_stock_threshold then 'low' else 'ok' end;
  new_status := case when new.stock <= 0 then 'out' when new.stock <= new.low_stock_threshold then 'low' else 'ok' end;
  if old_status <> new_status and new_status in ('low','out') then
    for admin in select id from public.profiles where lower(trim(role))='admin' loop
      insert into public.notifications(user_id,title,body,is_read)
      values (admin.id,
        case when new_status='out' then 'Product out of stock' else 'Low stock alert' end,
        (select name from public.products where id=new.product_id) || ' has stock level ' || new.stock);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_stock_alert on public.inventory;
create trigger inventory_stock_alert
after update of stock, low_stock_threshold on public.inventory
for each row execute function public.inventory_stock_transition_alert();

create or replace function public.manual_inventory_adjust(
  p_product_id uuid,
  p_operation text,
  p_quantity integer,
  p_reason text,
  p_reference text default null,
  p_performed_by uuid default null
) returns integer language plpgsql security definer set search_path=public as $$
declare
  inv public.inventory%rowtype;
  previous_stock integer;
  new_stock integer;
  movement_quantity integer;
  movement_type text;
begin
  if coalesce(trim(p_reason),'')='' then raise exception 'A reason is required.'; end if;
  if p_quantity < 0 then raise exception 'Quantity must not be negative.'; end if;
  select * into inv from public.inventory where product_id=p_product_id for update;
  if not found then
    insert into public.inventory(product_id,stock,low_stock_threshold) values(p_product_id,0,5) returning * into inv;
  end if;
  previous_stock := inv.stock;

  if p_operation='add' then
    if p_quantity=0 then raise exception 'Quantity must be greater than zero.'; end if;
    new_stock := previous_stock+p_quantity;
    movement_quantity := p_quantity;
    movement_type := 'stock_received';
  elsif p_operation='remove' then
    if p_quantity=0 then raise exception 'Quantity must be greater than zero.'; end if;
    if p_quantity>previous_stock then raise exception 'Cannot remove more stock than is available.'; end if;
    new_stock := previous_stock-p_quantity;
    movement_quantity := -p_quantity;
    movement_type := 'stock_removed';
  elsif p_operation='adjust' then
    new_stock := p_quantity;
    movement_quantity := new_stock-previous_stock;
    movement_type := 'stock_adjustment';
  else
    raise exception 'Invalid inventory operation.';
  end if;

  update public.inventory set stock=new_stock, updated_at=now() where product_id=p_product_id;
  insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,reference_number,performed_by)
  values(p_product_id,movement_type,movement_quantity,previous_stock,new_stock,p_reason,p_reference,p_performed_by);
  return new_stock;
end;
$$;

create or replace function public.update_inventory_threshold(
  p_product_id uuid,
  p_threshold integer,
  p_reason text,
  p_performed_by uuid default null
) returns integer language plpgsql security definer set search_path=public as $$
declare inv public.inventory%rowtype; begin
  if p_threshold < 0 then raise exception 'Threshold must not be negative.'; end if;
  if coalesce(trim(p_reason),'')='' then raise exception 'A reason is required.'; end if;
  select * into inv from public.inventory where product_id=p_product_id for update;
  if not found then
    insert into public.inventory(product_id,stock,low_stock_threshold) values(p_product_id,0,p_threshold) returning * into inv;
  end if;
  update public.inventory set low_stock_threshold=p_threshold, updated_at=now() where product_id=p_product_id;
  insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,performed_by)
  values(p_product_id,'threshold_update',0,inv.stock,inv.stock,p_reason,p_performed_by);
  return p_threshold;
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare item record; inv public.inventory%rowtype; reserved integer; begin
  for item in select product_id, quantity from public.order_items where order_id=p_order_id loop
    select * into inv from public.inventory where product_id=item.product_id for update;
    if not found then raise exception 'Inventory record missing for product %', item.product_id; end if;
    select coalesce(sum(quantity),0) into reserved from public.inventory_reservations
      where product_id=item.product_id and status='active' and expires_at>now();
    if inv.stock-reserved < item.quantity then raise exception 'Insufficient stock for product %', item.product_id; end if;
    insert into public.inventory_reservations(order_id,product_id,quantity,status,expires_at)
      values(p_order_id,item.product_id,item.quantity,'active',now()+interval '30 minutes')
      on conflict(order_id,product_id) do update set quantity=excluded.quantity,status='active',expires_at=excluded.expires_at,updated_at=now();
    insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,order_id)
      values(item.product_id,'order_reservation',item.quantity,inv.stock,inv.stock,'Stock reserved for order',p_order_id);
  end loop;
  return (select count(*) from public.inventory_reservations where order_id=p_order_id and status='active');
end;
$$;

create or replace function public.finalize_order_stock(p_order_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare reservation record; inv public.inventory%rowtype; prior integer; begin
  for reservation in select * from public.inventory_reservations where order_id=p_order_id and status='active' for update loop
    select * into inv from public.inventory where product_id=reservation.product_id for update;
    prior := inv.stock;
    if prior < reservation.quantity then raise exception 'Inventory changed during payment processing.'; end if;
    update public.inventory set stock=prior-reservation.quantity,updated_at=now() where product_id=reservation.product_id;
    update public.inventory_reservations set status='finalized',updated_at=now() where id=reservation.id;
    insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,order_id)
      values(reservation.product_id,'order_fulfillment',-reservation.quantity,prior,prior-reservation.quantity,'Paid order stock finalized',p_order_id);
  end loop;
  return (select count(*) from public.inventory_reservations where order_id=p_order_id and status='finalized');
end;
$$;

create or replace function public.release_order_stock(p_order_id uuid,p_reason text default 'Stock released')
returns integer language plpgsql security definer set search_path=public as $$
declare reservation record; inv public.inventory%rowtype; prior integer; begin
  for reservation in select * from public.inventory_reservations where order_id=p_order_id and status='active' for update loop
    update public.inventory_reservations set status='released',updated_at=now() where id=reservation.id;
  end loop;
  for reservation in select * from public.inventory_reservations where order_id=p_order_id and status='finalized' for update loop
    select * into inv from public.inventory where product_id=reservation.product_id for update;
    prior := inv.stock;
    update public.inventory set stock=prior+reservation.quantity,updated_at=now() where product_id=reservation.product_id;
    update public.inventory_reservations set status='cancelled',updated_at=now() where id=reservation.id;
    insert into public.inventory_movements(product_id,movement_type,quantity,previous_stock,new_stock,reason,order_id)
      values(reservation.product_id,'order_cancellation_restock',reservation.quantity,prior,prior+reservation.quantity,p_reason,p_order_id);
  end loop;
  return (select count(*) from public.inventory_reservations where order_id=p_order_id and status in ('released','cancelled'));
end;
$$;

create or replace function public.expire_inventory_reservations()
returns integer language plpgsql security definer set search_path=public as $$
declare expired_count integer;
begin
  update public.inventory_reservations
  set status='expired', updated_at=now()
  where status='active' and expires_at<=now();
  get diagnostics expired_count=row_count;
  return expired_count;
end;
$$;

-- Complete order lifecycle, expiry, activity, and verified-purchase reviews.

alter table public.orders
  add column if not exists expires_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists reminder_3d_sent_at timestamptz,
  add column if not exists reminder_1d_sent_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists amount_paid integer not null default 0,
  add column if not exists internal_admin_note text;

update public.orders
set expires_at = coalesce(expires_at, created_at + interval '7 days')
where expires_at is null;

alter table public.orders alter column expires_at set default (now() + interval '7 days');
create index if not exists idx_orders_expires_at on public.orders(expires_at) where payment_status <> 'paid';
create index if not exists idx_orders_customer_created on public.orders(user_id, created_at desc);

create table if not exists public.order_activity (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  description text,
  actor_type text not null default 'system' check (actor_type in ('customer','administrator','system')),
  actor_id uuid,
  reference text,
  is_customer_visible boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_activity_order on public.order_activity(order_id, created_at desc);
create index if not exists idx_order_activity_type on public.order_activity(event_type);

alter table public.reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists order_item_id uuid references public.order_items(id) on delete set null,
  add column if not exists verified_purchase boolean not null default false,
  add column if not exists status text not null default 'approved' check (status in ('pending','approved','rejected')),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists moderated_by uuid references public.profiles(id),
  add column if not exists moderated_at timestamptz;

create unique index if not exists uq_verified_review_order_item
  on public.reviews(order_item_id) where order_item_id is not null and verified_purchase = true;

alter table public.order_activity enable row level security;

create policy "Customers can view own order activity"
  on public.order_activity for select
  using (
    is_customer_visible = true
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Admins can manage order activity"
  on public.order_activity for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'));

-- Customer review reads and writes are enforced here and at the API.
drop policy if exists "Users can create reviews" on public.reviews;
create policy "Customers can create eligible reviews"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and o.user_id = auth.uid()
        and o.status = 'delivered'
    )
  );

create policy "Customers can edit own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and user_id is not distinct from user_id);

create policy "Admins can moderate reviews"
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'));

create or replace function public.log_order_activity(
  p_order_id uuid,
  p_event_type text,
  p_description text,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_reference text default null,
  p_visible boolean default true,
  p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  insert into public.order_activity(order_id,event_type,description,actor_type,actor_id,reference,is_customer_visible,details)
  values(p_order_id,p_event_type,p_description,p_actor_type,p_actor_id,p_reference,p_visible,p_details)
  returning id into result_id;
  return result_id;
end;
$$;

-- Prevent ordinary users from changing payment_status or administrative fields through direct table access.
drop policy if exists "Users can manage their own orders" on public.orders;
create policy "Customers can read their own orders"
  on public.orders for select
  using (auth.uid()=user_id or exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'));

create policy "Admins can manage all orders"
  on public.orders for all
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and lower(trim(p.role))='admin'));

create or replace function public.confirm_manual_payment(
  p_order_id uuid,
  p_amount integer,
  p_method text,
  p_reference text,
  p_note text,
  p_admin_id uuid
) returns boolean language plpgsql security definer set search_path=public as $$
declare ord public.orders%rowtype; successful_count integer;
begin
  select * into ord from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if ord.payment_status='paid' or ord.payment_status='refunded' then raise exception 'Payment has already been confirmed.'; end if;
  if p_amount <> ord.total then raise exception 'Amount received must match the outstanding order total.'; end if;
  if coalesce(trim(p_method),'')='' then raise exception 'Payment method is required.'; end if;

  insert into public.payments(order_id,provider,payment_method,status,reference,amount,transaction_date,result_description,phone_number,payer_phone)
  values(p_order_id,lower(p_method),lower(p_method),'successful',p_reference,p_amount,to_char(now(),'YYYY-MM-DD HH24:MI:SS'),coalesce(p_note,'Manually confirmed payment'),'','manual');

  update public.orders set
    payment_status='paid', status='processing', paid_at=coalesce(paid_at,now()), amount_paid=p_amount,
    internal_admin_note=coalesce(p_note,internal_admin_note), updated_at=now()
  where id=p_order_id;

  perform public.finalize_order_stock(p_order_id);
  perform public.log_order_activity(p_order_id,'payment_manually_confirmed','Payment manually confirmed by administrator','administrator',p_admin_id,p_reference,true,jsonb_build_object('amount',p_amount,'method',p_method,'note',p_note));
  perform public.log_order_activity(p_order_id,'order_processing_started','Order processing started','system',null,null,true,'{}'::jsonb);
  return true;
end;
$$;

create or replace function public.cancel_customer_order(
  p_order_id uuid,
  p_user_id uuid,
  p_reason text default null
) returns boolean language plpgsql security definer set search_path=public as $$
declare ord public.orders%rowtype;
begin
  select * into ord from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if ord.user_id is distinct from p_user_id then raise exception 'You cannot cancel another customer''s order.'; end if;
  if ord.status in ('cancelled','refunded','shipped','delivered') then raise exception 'This order can no longer be cancelled.'; end if;
  if ord.payment_status='paid' and ord.status not in ('pending_payment','pending','processing') then raise exception 'This paid order has already progressed beyond cancellation.'; end if;

  perform public.release_order_stock(p_order_id,'Customer cancellation' || case when coalesce(trim(p_reason),'')<>'' then ': '||trim(p_reason) else '' end);
  update public.orders set status='cancelled', payment_status=case when payment_status='paid' then 'refunded' else 'unpaid' end,
    cancellation_reason=p_reason, cancelled_at=now(), updated_at=now()
  where id=p_order_id;
  perform public.log_order_activity(p_order_id,'customer_cancellation','Customer cancelled the order','customer',p_user_id,null,true,jsonb_build_object('reason',p_reason));
  insert into public.notifications(user_id,title,body) values(p_user_id,'Order cancelled','Order '||ord.order_reference||' was cancelled.');
  return true;
end;
$$;

create or replace function public.expire_unpaid_orders()
returns integer language plpgsql security definer set search_path=public as $$
declare ord record; expired_count integer:=0;
begin
  for ord in select * from public.orders where payment_status in ('unpaid','pending','failed') and status not in ('cancelled','refunded','delivered') and expires_at<=now() for update loop
    perform public.release_order_stock(ord.id,'Automatic seven-day unpaid order expiration');
    update public.orders set status='cancelled',payment_status='failed',cancellation_reason='Automatically cancelled after seven unpaid days',cancelled_at=now(),updated_at=now() where id=ord.id;
    perform public.log_order_activity(ord.id,'automatic_cancellation','Automatically cancelled after seven unpaid days','system',null,null,true,'{}'::jsonb);
    if ord.user_id is not null then
      insert into public.notifications(user_id,title,body) values(ord.user_id,'Order expired','Order '||ord.order_reference||' was automatically cancelled after 7 days without confirmed payment.');
    end if;
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end;
$$;

create or replace function public.send_order_expiry_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare ord record; reminders integer:=0;
begin
  for ord in select * from public.orders where payment_status in ('unpaid','pending','failed') and status not in ('cancelled','refunded','delivered') and expires_at>now() and user_id is not null for update loop
    if ord.expires_at <= now()+interval '1 day' and ord.reminder_1d_sent_at is null then
      insert into public.notifications(user_id,title,body) values(ord.user_id,'Payment due tomorrow','Complete payment for order '||ord.order_reference||' before '||to_char(ord.expires_at,'YYYY-MM-DD HH24:MI')||'.');
      update public.orders set reminder_1d_sent_at=now() where id=ord.id; reminders:=reminders+1;
    elsif ord.expires_at <= now()+interval '3 days' and ord.reminder_3d_sent_at is null then
      insert into public.notifications(user_id,title,body) values(ord.user_id,'Payment reminder','Complete payment for order '||ord.order_reference||' within 3 days.');
      update public.orders set reminder_3d_sent_at=now() where id=ord.id; reminders:=reminders+1;
    end if;
  end loop;
  return reminders;
end;
$$;

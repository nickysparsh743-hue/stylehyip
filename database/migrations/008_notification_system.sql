-- Database-backed notification system for customers and administrators.

alter table public.notifications
  add column if not exists type text not null default 'account_update',
  add column if not exists reference_id uuid,
  add column if not exists reference_type text,
  add column if not exists expires_at timestamptz,
  add column if not exists event_key text;

update public.notifications
set expires_at = coalesce(expires_at, created_at + interval '30 days')
where expires_at is null;

alter table public.notifications alter column expires_at set default (now() + interval '30 days');

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_expires on public.notifications(expires_at);
create index if not exists idx_notifications_reference on public.notifications(reference_type, reference_id);
create unique index if not exists uq_notifications_event_key_user
  on public.notifications(user_id, event_key) where event_key is not null;

-- Only the notification owner may read or manage rows. System inserts run through security-definer helpers.
drop policy if exists "Users can manage their own notifications" on public.notifications;
create policy "Users can read own active notifications"
  on public.notifications for select
  using (auth.uid() = user_id and (expires_at is null or expires_at > now()));

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'account_update',
  p_reference_id uuid default null,
  p_reference_type text default null,
  p_event_key text default null,
  p_retention_days integer default 30
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid;
begin
  if p_user_id is null or coalesce(trim(p_title),'')='' then
    raise exception 'Notification recipient and title are required.';
  end if;

  insert into public.notifications(
    user_id,title,body,is_read,type,reference_id,reference_type,expires_at,event_key,created_at
  ) values (
    p_user_id,p_title,p_body,false,p_type,p_reference_id,p_reference_type,
    now() + make_interval(days => greatest(p_retention_days,1)),p_event_key,now()
  )
  on conflict do nothing
  returning id into result_id;

  return result_id;
end;
$$;

revoke all on function public.create_notification(uuid,text,text,text,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.create_notification(uuid,text,text,text,uuid,text,text,integer) to service_role;

create or replace function public.expire_notifications()
returns integer
language sql
security definer
set search_path=public
as $$
  with deleted as (
    delete from public.notifications
    where expires_at <= now()
    returning id
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.expire_notifications() from public, anon, authenticated;
grant execute on function public.expire_notifications() to service_role;

create or replace function public.mark_notification_read(p_notification_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.notifications
  set is_read=true
  where id=p_notification_id and user_id=p_user_id and (expires_at is null or expires_at>now());
  return found;
end;
$$;

revoke all on function public.mark_notification_read(uuid,uuid) from public, anon, authenticated;
grant execute on function public.mark_notification_read(uuid,uuid) to service_role;

create or replace function public.mark_all_notifications_read(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare updated_count integer;
begin
  update public.notifications
  set is_read=true
  where user_id=p_user_id and is_read=false and (expires_at is null or expires_at>now());
  get diagnostics updated_count=row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_all_notifications_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_all_notifications_read(uuid) to service_role;

-- Order lifecycle notifications are generated once per state transition by event_key.
create or replace function public.handle_order_notification_events()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare admin record;
begin
  if tg_op='INSERT' then
    if new.user_id is not null then
      perform public.create_notification(
        new.user_id,'Order placed','Your order '||new.order_reference||' was placed successfully.','order_placed',new.id,'order','order_placed:'||new.id::text,30
      );
    end if;

    for admin in select id from public.profiles where lower(trim(role))='admin' loop
      perform public.create_notification(
        admin.id,'New order received','A new order '||new.order_reference||' was placed by '||coalesce(new.customer_name,'a customer')||'.','order_placed',new.id,'order','admin_order_placed:'||new.id::text,30
      );
    end loop;
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    if new.user_id is not null then
      if new.payment_status='paid' then
        perform public.create_notification(new.user_id,'Payment confirmed','Payment for order '||new.order_reference||' was confirmed.','payment_success',new.id,'order','payment_success:'||new.id::text,30);
      elsif new.payment_status='failed' then
        perform public.create_notification(new.user_id,'Payment failed','Payment for order '||new.order_reference||' failed. You can retry payment.','payment_failed',new.id,'order','payment_failed:'||new.id::text,30);
      elsif new.payment_status='pending' then
        perform public.create_notification(new.user_id,'Payment initiated','A payment request was initiated for order '||new.order_reference||'.','payment_pending',new.id,'order','payment_initiated:'||new.id::text,30);
      end if;
    end if;

    for admin in select id from public.profiles where lower(trim(role))='admin' loop
      if new.payment_status='paid' then
        perform public.create_notification(admin.id,'Payment received','Payment for order '||new.order_reference||' was confirmed.','payment_success',new.id,'order','admin_payment_success:'||new.id::text,30);
      elsif new.payment_status='failed' then
        perform public.create_notification(admin.id,'Payment failed','Payment for order '||new.order_reference||' failed.','payment_failed',new.id,'order','admin_payment_failed:'||new.id::text,30);
      end if;
    end loop;
  end if;

  if new.status is distinct from old.status then
    if new.user_id is not null then
      if new.status='processing' then
        perform public.create_notification(new.user_id,'Order processing','Order '||new.order_reference||' is now processing.','order_processing',new.id,'order','order_processing:'||new.id::text,30);
      elsif new.status='shipped' then
        perform public.create_notification(new.user_id,'Order shipped','Order '||new.order_reference||' has been shipped.','order_shipped',new.id,'order','order_shipped:'||new.id::text,30);
      elsif new.status='delivered' then
        perform public.create_notification(new.user_id,'Order delivered','Order '||new.order_reference||' was delivered.','order_delivered',new.id,'order','order_delivered:'||new.id::text,30);
      elsif new.status='cancelled' then
        perform public.create_notification(new.user_id,'Order cancelled','Order '||new.order_reference||' was cancelled. Reason: '||coalesce(new.cancellation_reason,'No reason provided')||'.','order_cancelled',new.id,'order','order_cancelled:'||new.id::text,30);
      elsif new.status='refunded' then
        perform public.create_notification(new.user_id,'Refund update','A refund for order '||new.order_reference||' has been initiated or completed.','refund_update',new.id,'order','refund:'||new.id::text,30);
      end if;
    end if;

    if new.status='cancelled' then
      for admin in select id from public.profiles where lower(trim(role))='admin' loop
        perform public.create_notification(admin.id,'Order cancelled','Order '||new.order_reference||' was cancelled.','order_cancelled',new.id,'order','admin_order_cancelled:'||new.id::text,30);
      end loop;
    end if;
  end if;

  return new;
end;
$$;

 drop trigger if exists order_notification_events on public.orders;
create trigger order_notification_events
after insert or update of status,payment_status,cancellation_reason on public.orders
for each row execute function public.handle_order_notification_events();

-- Replace inventory alerts with notification-aware alerts and idempotent event keys.
create or replace function public.inventory_stock_transition_alert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  admin record;
  old_status text;
  new_status text;
  product_name text;
begin
  old_status := case when old.stock <= 0 then 'out' when old.stock <= old.low_stock_threshold then 'low' else 'ok' end;
  new_status := case when new.stock <= 0 then 'out' when new.stock <= new.low_stock_threshold then 'low' else 'ok' end;

  if old_status <> new_status and new_status in ('low','out') then
    select name into product_name from public.products where id=new.product_id;
    for admin in select id from public.profiles where lower(trim(role))='admin' loop
      if new_status='out' then
        perform public.create_notification(admin.id,'Product out of stock',coalesce(product_name,'Product')||' is now out of stock.', 'out_of_stock',new.product_id,'product','out_of_stock:'||new.product_id::text,30);
      else
        perform public.create_notification(admin.id,'Low stock alert',coalesce(product_name,'Product')||' has reached low stock ('||new.stock||' units).','low_stock',new.product_id,'product','low_stock:'||new.product_id::text,30);
      end if;
    end loop;
  end if;

  return new;
end;
$$;

-- Automated expiry and cleanup helpers.
create or replace function public.delete_expired_notifications()
returns integer language plpgsql security definer set search_path=public as $$
declare deleted_count integer;
begin
  delete from public.notifications where expires_at <= now();
  get diagnostics deleted_count=row_count;
  return deleted_count;
end;
$$;

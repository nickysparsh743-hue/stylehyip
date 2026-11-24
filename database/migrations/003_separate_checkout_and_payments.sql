-- Refactor checkout: order creation is independent from M-Pesa payment attempts.
create extension if not exists "pgcrypto";

alter table public.orders add column if not exists order_reference text;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists payment_status text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists access_token uuid;
alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists updated_at timestamptz default now();

alter table public.orders alter column access_token set default gen_random_uuid();
update public.orders set access_token = gen_random_uuid() where access_token is null;
update public.orders set order_reference = 'SIS-' || upper(substr(replace(id::text, '-', ''), 1, 10)) where order_reference is null;
update public.orders set customer_name = coalesce(customer_name, 'Customer');
update public.orders set payment_status = case
  when status = 'paid' or status = 'processing' or status = 'shipped' or status = 'delivered' then 'paid'
  else 'unpaid'
end where payment_status is null;

alter table public.orders alter column access_token set not null;
alter table public.orders alter column order_reference set not null;
alter table public.orders alter column payment_status set not null;
alter table public.orders alter column customer_name set not null;
create unique index if not exists uq_orders_order_reference on public.orders(order_reference);
create unique index if not exists uq_orders_access_token on public.orders(access_token);
create unique index if not exists uq_orders_idempotency_key on public.orders(idempotency_key) where idempotency_key is not null;

alter table public.order_items add column if not exists product_name text;
alter table public.order_items add column if not exists subtotal integer;
update public.order_items i set
  product_name = coalesce(product_name, p.name),
  subtotal = coalesce(subtotal, i.unit_price * i.quantity)
from public.products p
where i.product_id = p.id;

alter table public.payments add column if not exists payment_method text;
alter table public.payments add column if not exists payer_phone text;
alter table public.payments add column if not exists updated_at timestamptz default now();
update public.payments set payment_method = 'mpesa' where payment_method is null;
update public.payments set payer_phone = phone_number where payer_phone is null;
alter table public.payments alter column payment_method set not null;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending_payment','pending','processing','paid','shipped','delivered','cancelled','refunded'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('unpaid','pending','paid','failed','partially_paid','refunded'));

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('unpaid','pending','paid','successful','failed','cancelled','refunded'));

create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_payments_checkout_request_id on public.payments(checkout_request_id);
create index if not exists idx_payments_status on public.payments(status);

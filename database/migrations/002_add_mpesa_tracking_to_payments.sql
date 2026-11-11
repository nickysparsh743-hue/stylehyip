alter table public.payments add column if not exists checkout_request_id text;
alter table public.payments add column if not exists merchant_request_id text;
alter table public.payments add column if not exists mpesa_receipt_number text;
alter table public.payments add column if not exists phone_number text;
alter table public.payments add column if not exists transaction_date text;
alter table public.payments add column if not exists result_code text;
alter table public.payments add column if not exists result_description text;

# Stylehyip — Supabase and Site Configuration

This guide documents the Supabase, authentication, storage, M-Pesa, notifications, and deployment configuration required by Stylehyip.

## 1. Local Setup

Install dependencies and run the application:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Production build:

```bash
npm run build
npm run start
```

## 2. Environment Variables

Create `.env.local` in the project root.

```env
# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=25498260281

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# M-Pesa Daraja
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=http://localhost:3000/api/payments/mpesa/callback
```

### Variable Notes

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public browser/SSR key. It is safe to expose.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key. Never add it to `NEXT_PUBLIC_*`, browser code, Git, logs, or public documentation.
- `NEXT_PUBLIC_SITE_URL`: public HTTPS site URL in production.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: WhatsApp number in international format without `+`.
- `MPESA_CALLBACK_URL`: public HTTPS callback URL in production.
- `NEXT_PUBLIC_MPESA_CALLBACK_URL`: fallback callback variable. Prefer the server-only `MPESA_CALLBACK_URL`.
- `MPESA_ENV`: `sandbox` or `production`.

Restart the Next.js server after changing environment variables.

## 3. Supabase Project Setup

### Create the Project

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. Copy the service-role key only for trusted server environments.
4. Add the variables to `.env.local` and deployment environment settings.

### Enable Required Extensions

The migrations use PostgreSQL features and UUID helpers. The migrations include:

```sql
create extension if not exists "pgcrypto";
```

No additional extension is normally required for this application.

## 4. Apply Database Migrations

Open Supabase SQL Editor and apply every migration exactly once, in numerical order:

1. `001_add_background_image_url_to_categories.sql`
2. `002_add_mpesa_tracking_to_payments.sql`
3. `003_separate_checkout_and_payments.sql`
4. `004_add_site_configuration.sql`
5. `005_customer_management.sql`
6. `006_inventory_management.sql`
7. `007_order_management.sql`
8. `008_notification_system.sql`

For a fresh database, also review `src/lib/supabase/schema.sql` as a baseline. It may differ from the migrations where migrations add newer fields. The migrations are the authoritative implementation sequence for existing deployments.

### Migration Verification

Check core tables:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','categories','products','inventory','inventory_movements',
    'inventory_reservations','orders','order_items','payments','reviews',
    'addresses','notifications','customer_requests','customer_invitations',
    'account_activity_logs','order_activity','site_configuration'
  )
order by table_name;
```

Check notification columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
order by ordinal_position;
```

## 5. Authentication Configuration

### Enable Supabase Auth

In Supabase:

1. Open **Authentication > Providers**.
2. Enable Email/Password authentication.
3. Configure email confirmation according to the desired invitation and password workflow.
4. Configure SMTP for production invitations and password-reset emails.

### URL Configuration

Open **Authentication > URL Configuration** and configure:

- **Site URL**: your public production URL.
- **Redirect URLs**: add every environment:

```text
http://localhost:3000/auth/signup
https://YOUR_PRODUCTION_DOMAIN/auth/signup
https://YOUR_PRODUCTION_DOMAIN/auth/login
https://YOUR_PRODUCTION_DOMAIN/auth/reset
```

Invitation redirects are built from `NEXT_PUBLIC_SITE_URL` and point to `/auth/signup`.

### Email Templates

Production deployments should configure custom Supabase Auth templates for:

- Invite user
- Confirmation
- Password recovery
- Email change

Do not place invitation tokens or service-role keys in application logs.

### Auth Trigger

Migration `005_customer_management.sql` creates:

- `public.handle_new_auth_user()`
- `on_auth_user_created`
- `public.mark_customer_invitation_accepted()`
- `on_auth_user_accept_invitation`

These keep `auth.users` and `public.profiles` synchronized after invitations or authentication creation.

## 6. Administrator Accounts

Administrators are identified by:

```text
public.profiles.role = 'admin'
```

Create the first administrator only through a trusted operation. After applying migration `005`, update a known Auth user profile:

```sql
update public.profiles
set role = 'admin', account_status = 'active', is_active = true, updated_at = now()
where id = 'AUTH_USER_UUID';
```

Then verify:

```sql
select id, full_name, role, account_status
from public.profiles
where role = 'admin';
```

Customers cannot promote themselves through normal profile updates because migration `005` replaces the unrestricted profile update policy with an administrative-field-preserving policy.

## 7. Storage Configuration

Migration `004_add_site_configuration.sql` uses the `product-images` bucket.

### Verify Bucket

In Supabase Storage:

- Bucket ID: `product-images`
- Public: enabled

Verify:

```sql
select id, name, public
from storage.buckets
where id = 'product-images';
```

### Storage Folder Structure

Use:

```text
product-images/
  products/
  categories/
  settings/
```

Existing product and category upload helpers remain under `product-images`.

### Storage Policies

Migration `004` provides public reads and administrator-only writes for `settings/` objects. Existing product/category uploads may have separate policies created in earlier project configuration.

Recommended verification:

```sql
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Configure Next.js image domains for uploaded Supabase images. `next.config.mjs` already permits wildcard HTTPS hosts.

## 8. Row Level Security

RLS is enabled for profiles, products, categories, orders, payments, reviews, addresses, inventory, and notification-related tables.

### Security Rules

- Public users may submit account requests.
- Customers may read their own orders and notifications.
- Customers may not change payment status or role.
- Administrators may manage store records and administrative modules.
- Inventory movements and reservations are server-controlled.
- Notifications are owner-scoped.

Verify RLS:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Do not disable RLS as a workaround. Sensitive operations should use server APIs and the service-role client.

## 9. Realtime Notifications

Enable Realtime for notifications:

### Supabase Dashboard

1. Open **Database > Publications**.
2. Select `supabase_realtime`.
3. Enable `public.notifications`.

### SQL Alternative

```sql
alter publication supabase_realtime add table public.notifications;
```

The notification dropdown subscribes to:

```text
notifications:<authenticated-user-id>
```

with a `user_id=eq.<authenticated-user-id>` filter.

When Realtime is unavailable, the notification API and page refresh remain the fallback.

## 10. Notification Scheduled Jobs

Apply migration `008_notification_system.sql`, then schedule cleanup.

### Supabase Cron

Enable `pg_cron` if it is available in the project. Then schedule:

```sql
select cron.schedule(
  'expire-stylehyip-notifications',
  '0 * * * *',
  'select public.expire_notifications();'
);

select cron.schedule(
  'expire-stylehyip-unpaid-orders',
  '15 * * * *',
  'select public.expire_unpaid_orders();'
);

select cron.schedule(
  'send-stylehyip-order-reminders',
  '0 */6 * * *',
  'select public.send_order_expiry_reminders();'
);

select cron.schedule(
  'expire-stylehyip-inventory-reservations',
  '*/10 * * * *',
  'select public.expire_inventory_reservations();'
);
```

If `pg_cron` is unavailable or disabled, schedule these functions in Supabase Edge Functions or an external scheduler with service-role credentials.

Do not rely on customers visiting the site to expire notifications or unpaid orders.

See `SUPABASE_NOTIFICATIONS.md` for notification-specific operations.

## 11. M-Pesa Daraja Configuration

### Sandbox

Set:

```env
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
NEXT_PUBLIC_SITE_URL=https://YOUR_PUBLIC_SANDBOX_DOMAIN
MPESA_CALLBACK_URL=https://YOUR_PUBLIC_SANDBOX_DOMAIN/api/payments/mpesa/callback
```

Sandbox callback testing normally requires a public HTTPS tunnel or public deployment. M-Pesa callbacks cannot reliably reach `localhost`.

### Production

Set:

```env
MPESA_ENV=production
NEXT_PUBLIC_SITE_URL=https://YOUR_PRODUCTION_DOMAIN
MPESA_CALLBACK_URL=https://YOUR_PRODUCTION_DOMAIN/api/payments/mpesa/callback
```

Use production credentials from Daraja and a publicly accessible HTTPS endpoint:

```text
https://YOUR_PRODUCTION_DOMAIN/api/payments/mpesa/callback
```

There is also a legacy callback route under:

```text
/api/mpesa/callback
```

The STK Push integration sends callbacks to `MPESA_CALLBACK_URL` and defaults to `/api/payments/mpesa/callback`.

### Callback Requirements

- Use HTTPS in production.
- Do not use a private IP or `localhost`.
- Do not add query parameters unless intentionally handled.
- Match the callback URL exactly as configured in Daraja.
- Keep the route publicly accessible, but validate request identifiers and amounts server-side.
- Record only trusted callback results.
- Never treat STK Push initiation as successful payment.

## 12. Storage and Image Configuration

Allowed product/settings image types are:

- JPEG
- PNG
- WebP

Maximum image size is currently 5 MB in `src/lib/supabase/storage.js`.

Uploaded settings and product URLs are public URLs. Do not store binary file data in JSONB or database text fields.

## 13. Deploying the Site

Set all environment variables in the hosting provider:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- M-Pesa variables

Set `NEXT_PUBLIC_SITE_URL` to the final production origin, including HTTPS and no trailing slash.

### Minimum Production Checklist

- Supabase migrations applied in order.
- Auth redirect URLs include production paths.
- SMTP configured.
- First administrator profile assigned.
- Storage bucket and policies configured.
- Realtime enabled.
- Notification and order cron jobs scheduled.
- M-Pesa production credentials configured.
- Public callback URL configured and HTTPS-accessible.
- Service-role key restricted to server environment variables.

## 14. Current Testing and Known Limitations

The following areas should be manually verified after configuration:

- Login, logout, invitation acceptance, and password recovery.
- Customer and administrator RLS separation.
- Customer request approval and rejection.
- New orders and payment callback idempotency.
- Manual payment confirmation.
- Seven-day order expiry and reminders.
- Inventory reservation, finalization, and restoration.
- Notification unread counts and Realtime updates.
- Notification 30-day expiry and scheduled cleanup.
- Public site settings and Supabase Storage uploads.

Known implementation placeholders:

- `src/app/auth/reset/page.js` is currently UI-only and does not yet perform a Supabase password-reset request.
- `src/app/api/auth/[...nextauth]/route.js` is a placeholder and is not the active Supabase authentication implementation.
- Custom approval, decline, account, cancellation, and refund email templates require external email/SMTP integration if implemented beyond Supabase Auth and database notifications.

## 15. Useful Verification Queries

### Confirm Supabase Realtime

```sql
select *
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename = 'notifications';
```

### Confirm Notification Owner Data

```sql
select id, user_id, title, type, is_read, expires_at, event_key, created_at
from public.notifications
order by created_at desc
limit 50;
```

### Confirm Expired Notifications

```sql
select count(*)
from public.notifications
where expires_at <= now();
```

### Confirm Unpaid Orders

```sql
select id, order_reference, status, payment_status, expires_at
from public.orders
where payment_status in ('unpaid','pending','failed')
  and expires_at <= now()
  and status not in ('cancelled','refunded','delivered');
```

## 16. Security Checklist

- Never commit `.env.local` or service-role credentials.
- Keep Supabase RLS enabled.
- Do not use the service-role client inside browser components.
- Do not expose payment callbacks or administrator APIs without server authorization.
- Validate stock, order ownership, payment amounts, callback identifiers, and role changes on the server.
- Preserve order, payment, activity, and inventory history independently from notifications.

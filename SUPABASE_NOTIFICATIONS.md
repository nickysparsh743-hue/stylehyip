# Supabase Notifications Configuration

This guide configures the database-backed notification system for Stylehyip.

## 1. Apply Database Migration

Run migrations in order in the Supabase SQL Editor:

1. `database/migrations/005_customer_management.sql`
2. `database/migrations/006_inventory_management.sql`
3. `database/migrations/007_order_management.sql`
4. `database/migrations/008_notification_system.sql`

The final migration:

- Adds `type`, `reference_id`, `reference_type`, `expires_at`, and `event_key` to `public.notifications`.
- Creates notification indexes and owner-only RLS policies.
- Creates idempotent notification event keys.
- Adds order and inventory notification triggers.
- Creates notification expiry cleanup functions.

## 2. Enable Supabase Realtime

In the Supabase dashboard:

1. Open **Database > Publications**.
2. Open the `supabase_realtime` publication.
3. Enable `public.notifications`.

Alternatively, run:

```sql
alter publication supabase_realtime add table public.notifications;
```

Realtime updates are scoped by the frontend subscription filter:

```text
user_id=eq.<authenticated-user-id>
```

## 3. Configure Notification Retention

Notifications created by the migration expire 30 days after creation.

The default is controlled by `p_retention_days` in:

```sql
public.create_notification(..., p_retention_days integer default 30)
```

Update existing notifications with:

```sql
update public.notifications
set expires_at = now() + interval '30 days'
where expires_at is null;
```

## 4. Schedule Automatic Cleanup

The migration provides:

```sql
select public.expire_notifications();
select public.delete_expired_notifications();
```

Recommended Supabase Scheduled Function setup:

1. Open **Database > Cron Jobs** or **Integrations > Cron**.
2. Create a job running hourly:

```sql
select public.expire_notifications();
```

A daily cleanup is also sufficient:

```sql
select public.delete_expired_notifications();
```

Use a service-role or privileged database schedule. Ordinary authenticated users must not call the cleanup functions.

## 5. Schedule Order Expiry Reminders

If migration `007_order_management.sql` is applied, schedule:

```sql
select public.send_order_expiry_reminders();
select public.expire_unpaid_orders();
```

Recommended schedule:

- Reminders: every six hours.
- Automatic expiry: every hour.

These functions use the existing database functions and notification table without deleting orders or payment history.

## 6. Verify Row Level Security

A customer should only be able to:

- Read notifications where `auth.uid() = user_id`.
- Update their own notifications.
- Delete their own notifications.

Expired notifications should not be visible.

Test with SQL as an authenticated user:

```sql
select *
from public.notifications
order by created_at desc;
```

This should return only notifications owned by the active customer or administrator.

Do not grant `authenticated` or `anon` direct insert access to `public.notifications`. System notifications should be created by:

- Security-definer database triggers.
- Trusted Next.js server code using `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Test Notification Delivery

### Create an Order

Creating an order should create:

- A `order_placed` notification for the customer.
- A `order_placed` notification for each administrator.

### Change Payment Status

Payment updates should create:

- `payment_success` after a confirmed paid status.
- `payment_failed` after a failed status.
- `payment_pending` after payment initiation.

Repeated callbacks are prevented by the existing payment handling and notification event keys.

### Change Order Status

Changing an order status should create:

- `order_processing`
- `order_shipped`
- `order_delivered`
- `order_cancelled`
- `refund_update`

### Change Inventory Stock

An inventory transition to low stock or zero should create administrator notifications with:

- `low_stock`
- `out_of_stock`

These notifications use stable event keys, preventing repeated notifications for the same transition.

## 8. Application API

Authenticated browser requests use:

```text
GET  /api/notifications
PATCH /api/notifications
```

Supported actions:

```json
{ "action": "read", "id": "notification-uuid" }
```

```json
{ "action": "read_all" }
```

```json
{ "action": "delete", "id": "notification-uuid" }
```

```json
{ "action": "clear_read" }

## 9. Required Environment Variables

No new public environment variable is required for notifications.

Existing required server variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in server-side code. Never add it to browser JavaScript or `NEXT_PUBLIC_*` variables.

## 10. Troubleshooting

### Notification count is not updating

- Confirm the user is authenticated.
- Confirm Realtime is enabled for `public.notifications`.
- Confirm the Realtime policy and browser subscription allow the user's own rows.
- Check browser network requests to `/api/notifications`.

### Repeated notifications appear

- Confirm migrations `007` and `008` are applied.
- Confirm the notification triggers exist only once.
- Confirm `event_key` values are unique for the user.

### Customers cannot see notifications

- Verify `expires_at` is in the future.
- Verify `user_id` matches the Supabase authenticated user ID.
- Verify RLS policies are enabled.

### Administrators do not receive notifications

- Verify their profile role is exactly `admin`, with matching case-insensitive RLS checks.
- Verify the order, customer request, review, or inventory trigger creates administrator notifications.

## Security Reminder

Do not expose customer notifications or administrative notifications through public APIs. The `/api/notifications` route requires authentication and always scopes data to the current user.

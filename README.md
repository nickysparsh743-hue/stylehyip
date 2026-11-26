# Stylehyip

Stylehyip is a Next.js ecommerce storefront and administration dashboard backed by Supabase Auth, PostgreSQL, Storage, Realtime, and M-Pesa Daraja.

## Features

### Storefront

- Browse categories and products with search and responsive layouts
- View product details, images, and share products
- Persistent cart for guests and authenticated users
- Customer signup, login, profile, addresses, and order history
- Checkout and M-Pesa STK Push payment workflows
- Customer notification center with read, delete, and clear actions
- Legal pages and contact information

### Administration

- Dashboard activity and sales overview
- Product and category management
- Inventory stock and reservation management
- Order processing, status updates, and payment review
- Customer management, account status, invitations, and administrators
- Customer request handling
- Site settings and public configuration
- Store notification management and account activity records

### Supabase and Integrations

- Row Level Security for customer and administrator data
- Supabase Auth profile synchronization
- Public `product-images` Storage bucket
- Realtime notifications for authenticated users
- Database triggers and scheduled cleanup for notifications and expired orders
- M-Pesa callback validation and payment status tracking

## Local Setup

Requirements:

- Node.js and npm
- A Supabase project
- Safaricom Daraja credentials for live M-Pesa testing

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create `.env.local` using the variables in `SUPABASE_SITE_SETUP.md`. This file is intentionally ignored by Git and must not be committed.

## Database Setup

Apply the SQL migrations in `database/migrations/` in ascending numeric order:

| Migration | Purpose |
| --- | --- |
| `001` | Category background images |
| `002` | M-Pesa payment tracking |
| `003` | Checkout and payment separation |
| `004` | Site configuration and public settings |
| `005` | Customer management and invitations |
| `006` | Inventory and reservations |
| `007` | Order lifecycle and expiry handling |
| `008` | Notification system and cleanup |

For a fresh database, review `src/lib/supabase/schema.sql` before applying migrations. Existing deployments should treat the numbered migrations as the authoritative upgrade sequence.

Detailed setup instructions:

- [`SUPABASE_SITE_SETUP.md`](./SUPABASE_SITE_SETUP.md) — environment, authentication, storage, M-Pesa, migrations, and deployment
- [`SUPABASE_NOTIFICATIONS.md`](./SUPABASE_NOTIFICATIONS.md) — Realtime, notification RLS, retention, cleanup, and scheduling

## Environment Variables

Application and public variables:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER=25498260281
```

Server-only variables:

```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=http://localhost:3000/api/payments/mpesa/callback
```

Use a public HTTPS callback URL in production. `localhost` callbacks cannot be reached by Safaricom Daraja.

## Supabase Configuration

Before running the full application:

1. Apply migrations `001` through `008`.
2. Enable email/password authentication.
3. Configure Site URL and Auth redirects.
4. Create the public `product-images` storage bucket.
5. Enable Realtime for `public.notifications`.
6. Schedule notification and order cleanup database functions.
7. Create the first administrator through a trusted database or server operation.

Keep Supabase Row Level Security enabled. Browser code must not update administrator roles or notification data belonging to another account.

## M-Pesa

The application initiates STK Push requests through server routes and records payment lifecycle updates in Supabase. A payment is only confirmed by a validated successful callback.

Production deployments require:

- Production Daraja credentials
- `MPESA_ENV=production`
- A public HTTPS `MPESA_CALLBACK_URL`
- A registered, correct business shortcode and passkey
- Server-only access to the service-role and Daraja secrets

## Build and Run

```bash
npm run lint
npm run build
npm run start
```

## Security

- Never commit `.env.local`, Supabase service-role keys, or Daraja secrets
- Keep privileged operations in authenticated Next.js server routes or service-role database functions
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through `NEXT_PUBLIC_*`
- Preserve Row Level Security policies on production tables
- Review SQL migrations before applying them to an existing database

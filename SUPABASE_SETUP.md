# Supabase Setup

## Public Configuration

The browser configuration lives in `assets/config/supabase-config.js` and contains only the public project URL and anon key. The anon key is intentionally public. Never place a service-role key, database password, or Supabase management token in that file, an HTML page, browser storage, or Git.

`.env.example` documents the public variable names for tooling. Create a local `.env` only when a script requires one; `.env*` files are ignored except for the example.

## Apply The Database

### Current production blocker (verified 2026-07-14)

The target REST endpoint currently returns HTTP 404 / `PGRST205` because `public.categories` does not exist. The authenticated CLI account checked during this work did not include project `cruvatqjbignywiwoszh`, and the supplied anon key cannot create schemas, run migrations, seed data, or create the first Auth user. Do not deploy this frontend commit until an authorized project member applies the database and completes the smoke test below.

Apply the files in filename order, then seed:

```powershell
supabase link --project-ref cruvatqjbignywiwoszh
supabase db push
supabase db execute --file supabase/seed.sql
```

If the installed CLI does not provide `db execute`, open the target project's trusted SQL editor and run `supabase/seed.sql` after `db push`. Do not run migrations through the anon key.

Verify the deterministic source before applying it:

```powershell
node scripts/generate-supabase-seed.cjs --check
node scripts/test-supabase-static.cjs
```

The seed is idempotent by category and product slug and asserts exactly 10 categories and 101 menu items.

## Database Tests

With `psql` connected to a migrated and seeded test database:

```powershell
npm run test:db:behavior
```

This rollback-only suite exercises real `anon` and `authenticated` roles. It verifies trusted pricing, idempotency, unavailable/missing/invalid item rejection, unique order numbers, historical snapshots, public denial paths, the admin allowlist, dashboard access, server-side order search, order status updates, and menu updates.

In a local Supabase stack with pgTAP installed:

```powershell
supabase test db
```

Never run either test against production because database sequences advance even when the surrounding transaction rolls back.

## Create The First Admin

1. In Supabase Authentication, create an email/password user. Public signup remains disabled.
2. Copy the Auth user UUID.
3. In the trusted SQL editor, run:

```sql
insert into private.admin_users (user_id)
values ('REPLACE-WITH-AUTH-USER-UUID');
```

4. Sign in at `/admin/login/`.
5. Confirm `/rest/v1/rpc/is_admin` returns `true` for that authenticated session.

Removing the allowlist row revokes admin RPC access immediately. There is intentionally no browser-accessible Create Admin flow.

## Netlify

The site remains a static deploy. `netlify.toml` adds no-store, noindex, frame, permissions, and CSP headers to `/admin/*`. The CSP permits connections only to the site and Supabase HTTPS/WebSocket endpoints.

Deploy only after the target project has all migrations and the seed. Otherwise public browsing falls back to the bundled read-only menu, but checkout correctly refuses to report a successful order.

## Security Boundary

- Public roles can read only active categories and available items.
- Guest writes occur only through `create_order`; direct order-table writes and all public order reads are revoked.
- Authenticated status alone grants no staff access. Every admin RPC checks `private.admin_users`.
- Prices, names, availability, totals, order numbers, status, and snapshots are determined in PostgreSQL.
- Checkout retains the pending idempotency token across reloads after an uncertain response and clears it only after confirmed success or a changed request fingerprint.
- The public RPC does not include IP/device rate limiting because Postgres receives no trustworthy client IP through PostgREST. Before high-volume public promotion, place the RPC behind a trusted server/Edge Function with bot verification and rate limiting, then revoke direct anon execution. Do not add a browser-only CAPTCHA check and call it secure.

## Production Smoke Test

After deployment, verify:

1. `/rest/v1/categories` and `/rest/v1/menu_items` return live rows with the anon key.
2. Homepage still shows eight products and `/menu/` shows 101 available seeded products.
3. Submit one controlled COD order and confirm the returned `POM-YYYY-NNNNN` record and snapshots in the admin UI.
4. Retry the identical request token and confirm there is still one order.
5. Confirm an anonymous order-table select and an authenticated non-admin admin RPC are denied.
6. Sign in as the allowlisted admin, update a test order status, toggle one menu item, verify the public menu, then restore the item.

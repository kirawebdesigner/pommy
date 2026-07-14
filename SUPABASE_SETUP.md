# Supabase Setup

## Public Configuration

The browser configuration lives in `assets/config/supabase-config.js` and contains only the public project URL and anon key. The anon key is intentionally public. Never place a service-role key, database password, or Supabase management token in that file, an HTML page, browser storage, or Git.

`.env.example` documents the public variable names for tooling. Create a local `.env` only when a script requires one; `.env*` files are ignored except for the example.

## Apply The Database

### Production database status (verified 2026-07-14)

Project `cruvatqjbignywiwoszh` is linked and healthy. Migrations `20260714000100` through `20260714000400` and the deterministic seed have been applied. The live database contains exactly 10 categories and 101 menu items, and canonical IDs/slugs, names, prices, and category relationships match `assets/data/menu.js`.

The confirmed Auth user `admin@pommy.menu` is allowlisted in `private.admin_users`. Live role checks verified allowlisted dashboard/menu/category access and non-allowlisted denial. Smoke order `POM-2026-00001` verified trusted 820 ETB pricing, snapshot creation, one-row idempotent replay, mismatched-token rejection, and anonymous order-table/admin-RPC denial. Production admin sign-in and order status mutation were manually verified successfully with no errors.

Apply the files in filename order, then seed:

```powershell
supabase link --project-ref cruvatqjbignywiwoszh
supabase db push
supabase db query --linked --file supabase/seed.sql
```

If the installed CLI does not provide `db query`, open the target project's trusted SQL editor and run `supabase/seed.sql` after `db push`. Do not run migrations through the anon key.

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

The site remains a static deploy. Production deployment `6a55a473bc2a11ca20b40698` is live at `https://pommydemo.netlify.app`. `netlify.toml` adds no-store, noindex, frame, permissions, and CSP headers to `/admin/*`. The CSP permits connections only to the site and Supabase HTTPS/WebSocket endpoints.

Deploy only after the target project has all migrations and the seed. Otherwise public browsing falls back to the bundled read-only menu, but checkout correctly refuses to report a successful order.

## Security Boundary

- Public roles can read only active categories and available items.
- Guest writes occur only through `create_order`; direct order-table writes and all public order reads are revoked.
- Authenticated status alone grants no staff access. Every admin RPC checks `private.admin_users`.
- Prices, names, availability, totals, order numbers, status, and snapshots are determined in PostgreSQL.
- Checkout retains the pending idempotency token across reloads after an uncertain response and clears it only after confirmed success or a changed request fingerprint.
- The public RPC does not include IP/device rate limiting because Postgres receives no trustworthy client IP through PostgREST. Before high-volume public promotion, place the RPC behind a trusted server/Edge Function with bot verification and rate limiting, then revoke direct anon execution. Do not add a browser-only CAPTCHA check and call it secure.

## Verified Production Smoke Test

The following production checks passed:

1. `/rest/v1/categories` and `/rest/v1/menu_items` return live rows with the anon key.
2. The homepage shows eight featured products and `/menu/` shows 101 available seeded products.
3. A controlled COD order returned a `POM-YYYY-NNNNN` record with trusted snapshots.
4. Retrying the identical request token returned the same order without duplication.
5. Anonymous order-table access and authenticated non-admin admin RPC access are denied.
6. The allowlisted admin signed in successfully, changed a production test order status, and the mutation completed without errors.

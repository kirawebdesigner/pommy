# Supabase Data Schema

## Architecture

Pommy uses Supabase Postgres for the live menu, guest Cash on Delivery orders, immutable order-item snapshots, and an explicit admin allowlist. The browser uses only the project URL and anon key. Service-role credentials are not required by public or admin browser code and must never be committed.

```text
auth.users 1 --- 0..1 private.admin_users

public.categories 1 --- * public.menu_items
public.orders     1 --- * public.order_items
public.menu_items 1 --- * public.order_items (nullable historical reference)
```

`private.admin_users` is intentionally outside the exposed `public` API schema. Admin browser operations use authenticated, authorization-checking RPCs rather than direct access to the allowlist.

## Tables

### `public.categories`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` | Primary key, generated in Postgres |
| `name` | `text` | Unique, nonblank, max 100 characters |
| `slug` | `text` | Unique lowercase route-safe identity |
| `description` | `text` | Optional |
| `sort_order` | `integer` | Non-negative, deterministic display order |
| `is_active` | `boolean` | Defaults to `true`; inactive categories are not public/orderable |
| `created_at` | `timestamptz` | Database default |
| `updated_at` | `timestamptz` | Database trigger maintained |

### `public.menu_items`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` | Primary key, generated in Postgres |
| `category_id` | `uuid` | Required FK to `categories`; category deletion is restricted |
| `name` | `text` | Nonblank, max 160 characters |
| `slug` | `text` | Unique stable route identity; admin patch RPC cannot change it |
| `description` | `text` | Optional, canonical source text preserved |
| `price` | `numeric(12,2)` | Exact ETB value, non-negative |
| `image_url` | `text` | Optional public asset path/URL |
| `is_available` | `boolean` | Defaults to `true`; false items cannot be ordered |
| `is_featured` | `boolean` | Defaults to `false` |
| `sort_order` | `integer` | Non-negative canonical source order |
| `created_at` | `timestamptz` | Database default |
| `updated_at` | `timestamptz` | Database trigger maintained |

The canonical seed contains 101 menu items in 10 categories. It preserves four existing `featured` flags. The public eight-card showcase must use those first and apply its documented deterministic available-item fallback without changing database flags.

### `public.orders`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` | Primary key |
| `order_number` | `text` | Unique, database-generated `POM-YYYY-NNNNN` value backed by a sequence |
| `client_order_token` | `uuid` | Unique checkout-attempt idempotency token |
| `request_hash` | `bytea` | SHA-256 of normalized order input; not returned by RPCs |
| `customer_name` | `text` | Required, 1-120 characters |
| `phone` | `text` | Normalized Ethiopian `09...` or `+2519...` format |
| `order_type` | `text` | `delivery` or `takeaway`; RPC maps current `pickup` alias to `takeaway` |
| `delivery_area` | `text` | Required for delivery, null for takeaway |
| `address` | `text` | Required for delivery, null for takeaway |
| `landmark` | `text` | Optional for delivery, null for takeaway |
| `notes` | `text` | Optional, max 1000 characters |
| `subtotal` | `numeric(12,2)` | Non-negative and calculated only from locked live menu rows |
| `payment_method` | `text` | Fixed to `cash_on_delivery` |
| `status` | `text` | `new`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `completed`, or `cancelled` |
| `created_at` | `timestamptz` | Database default |
| `updated_at` | `timestamptz` | Database trigger maintained |

The order-number sequence is concurrency-safe and may contain gaps after rolled-back transactions. It never uses row counts.

### `public.order_items`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` | Primary key |
| `order_id` | `uuid` | Required FK to `orders`; deletion is restricted |
| `menu_item_id` | `uuid` | Nullable FK; menu deletion sets only this reference to null |
| `product_name` | `text` | Immutable order-time name snapshot |
| `unit_price` | `numeric(12,2)` | Immutable order-time price snapshot |
| `quantity` | `integer` | 1-99 |
| `line_total` | `numeric(12,2)` | Stored generated value: `unit_price * quantity` |
| `created_at` | `timestamptz` | Database default |

No browser role receives update or delete privileges on order items. Historical display always uses `product_name`, `unit_price`, and `line_total`, never the current menu item.

### `private.admin_users`

| Field | Type | Rules |
|---|---|---|
| `user_id` | `uuid` | Primary key and FK to `auth.users(id)` |
| `created_at` | `timestamptz` | Database default |

An authenticated user is an admin only when their Auth UUID is present in this table. There is no public signup-to-admin path.

## Transactional Order Creation

`public.create_order(customer_name, phone, order_type, items, client_order_token, delivery_area, address, landmark, notes)` is the only guest write path.

1. Validate and normalize customer fields and `pickup`/`takeaway` naming.
2. Accept cart lines containing only a stable menu `slug` and integer `quantity`.
3. Aggregate duplicate slugs and reject empty, malformed, missing, inactive-category, unavailable, or excessive-quantity lines.
4. Hash the normalized request and return the original response when the same token and request are retried.
5. Lock all resolved menu/category rows with `FOR SHARE`, then calculate trusted line totals and subtotal.
6. Insert the order and snapshot items in the same Postgres transaction.
7. Return the trusted order ID, order number, item snapshots, subtotal, payment method, status, and creation time.

A reused token with different normalized input is rejected. Browser-provided names, prices, line totals, and subtotal are ignored even if extra JSON properties are sent.

## Admin RPCs

All admin RPCs are `SECURITY DEFINER`, use an empty `search_path`, and call the private allowlist assertion before reading or writing protected records.

| RPC | Purpose |
|---|---|
| `is_admin()` | Verify the current authenticated user is allowlisted |
| `admin_dashboard()` | Status metrics and 20 most recent orders; today uses `Africa/Nairobi` |
| `admin_list_orders(status, limit, offset, search)` | Server-filtered order list with snapshot items |
| `admin_get_order(order_id)` | Complete order details |
| `admin_update_order_status(order_id, status)` | Update only the validated status field |
| `admin_list_menu_items()` | Full menu including unavailable items |
| `admin_list_categories()` | Full category list including inactive categories |
| `admin_update_menu_item(id, patch)` | Whitelisted menu fields; slug is excluded |
| `admin_update_category(id, patch)` | Whitelisted category fields; slug is excluded |

Menu patches permit `name`, `description`, `price`, `image_url`, `is_available`, `is_featured`, `category_id`, and `sort_order`. Category patches permit `name`, `description`, `sort_order`, and `is_active`.

## Grants And RLS

RLS is enabled on all five tables. The private allowlist has no browser policy or grant.

| Capability | `anon` | Authenticated non-admin | Approved admin |
|---|---:|---:|---:|
| Read active categories | Yes | Yes | Yes |
| Read available items in active categories | Yes | Yes | Yes |
| Read inactive/unavailable menu records | No | No | Through admin RPC |
| Create a validated order | Through RPC | Through RPC | Through RPC |
| Insert directly into order tables | No | No | No browser grant |
| List/read customer orders | No | No | Through admin RPC |
| Update order status | No | No | Through admin RPC |
| Modify menu/categories | No | No | Through admin RPC |
| Read/change admin allowlist | No | No | No browser grant |

Anonymous users cannot list orders, read customer data, mutate menu data, or directly insert order rows. Authenticated status alone grants no admin capability.

## Indexes And Triggers

- Unique indexes back category and menu slugs, order numbers, and idempotency tokens.
- Menu indexes cover category joins, availability, featured selection, and public display order.
- Order indexes cover status filters and reverse chronological listing.
- `order_items.order_id` supports order-detail loading.
- Database triggers maintain `updated_at` for categories, menu items, and orders.

## Seed Pipeline

`node scripts/generate-supabase-seed.cjs` parses `assets/data/menu.js`, validates exactly 10 categories and 101 unique menu records, and writes deterministic `supabase/seed.sql`. The output uses slug-based upserts and ends with database count assertions.

Run `node scripts/generate-supabase-seed.cjs --check` in CI or before committing. Known source values are intentionally unchanged, including Double Peanut Tea at 200 ETB, Double Fasting Macchiato at 200 ETB, and Peanut at 1330 ETB.

## Migrations And Validation

Apply migrations and seed with the Supabase CLI:

```powershell
supabase start
supabase db reset
node scripts/test-supabase-static.cjs
supabase test db
```

The pgTAP suite checks counts, relationships, trusted pricing, idempotency, snapshot preservation, and missing/unavailable item rejection. `supabase/tests/database-behavior.sql` provides the same critical transaction and authorization checks without requiring pgTAP and runs against any migrated PostgreSQL/Supabase-compatible test database through `npm run test:db:behavior`.

See `SUPABASE_SETUP.md` for target-project deployment, first-admin creation, production smoke tests, and the public-order abuse boundary.

## First Admin Setup

1. Create the email/password user in Supabase Auth from the trusted dashboard. Public signup remains disabled.
2. Copy that user's UUID.
3. In the Supabase SQL editor, run the following with the real UUID:

```sql
insert into private.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000000');
```

4. Sign in through the admin login UI and call `is_admin()` before loading protected data.

Removing the row revokes admin database access immediately. Never expose an allowlist insert RPC or a public Create Admin control.

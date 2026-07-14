# Technical Specification

## Stack

- Static HTML pages served over HTTP.
- Existing Webflow CSS and runtime retained where required for layout, navbar animation, and interactions.
- Local vanilla JavaScript for menu rendering, product details, cart, checkout, and admin screens.
- Supabase Postgres for categories, menu items, COD orders, immutable order-item snapshots, and admin authorization.
- Supabase Auth email/password sessions for invite-only staff access.
- `localStorage` remains the customer cart store; customer orders are persisted only after the database confirms the transaction.
- No public-site framework migration and no payment gateway.

## Modules

- `assets/data/menu.js`: canonical menu records with numeric ETB prices.
- `assets/js/supabase-client.js`: the single browser Supabase client using public URL and anon credentials.
- `assets/js/menu-service.js`: normalized live menu reads, in-memory reuse, and bundled read-only fallback.
- `assets/config/order-config.js`: order channel and verified Pommy contact configuration.
- `assets/js/pommy-site.js`: shared branding, navigation, footer, cart, accessibility, and page bootstrapping.
- `assets/js/menu-page.js`: filtering/search and product listing.
- `assets/js/product-page.js`: product detail rendering and add-to-cart behavior.
- `assets/js/checkout-page.js`: checkout UI and validation.
- `assets/js/order-service.js`: idempotent `create_order` RPC submission, response normalization, and confirmation formatting.
- `assets/css/pommy-site.css`: scoped additions that reuse the existing visual language.
- `supabase/migrations/`: versioned schema, functions, grants, RLS policies, and deterministic seed data.
- `admin/`, `assets/js/admin/`, `assets/css/admin.css`: isolated protected staff interface.

## Security And Data

- No card data is requested or stored; payment method is fixed to `cash_on_delivery`.
- The browser sends product IDs and quantities; PostgreSQL resolves names, availability, prices, line totals, and subtotal.
- Anonymous clients cannot list or directly insert orders. They can execute only the constrained transactional order RPC.
- Admin access requires both a valid Supabase Auth user and explicit membership in the private admin allowlist.
- RLS, revoked table privileges, and field-whitelisting admin RPCs prevent public writes, non-admin access, subtotal changes, and order-item snapshot edits.
- Only the public Supabase URL and anon key may be shipped to browsers. Service-role and database credentials are never committed.
- Render dynamic content with DOM APIs and `textContent` where possible.
- Ethiopian-style phone validation accepts local `09...` and international `+2519...` forms.

## Routes

- Primary: `/`, `/menu/`, `/about/`, `/blog/`, `/contact/`, `/checkout/`.
- Product details: `/product/<slug>/`.
- Blog details: `/blog-posts/<slug>/`.
- Utility pages remain unlinked and `noindex`.
- Admin: `/admin/login/`, `/admin/`, `/admin/orders/`, `/admin/menu/`; all are `noindex` and data access is enforced by Auth and RLS.

## Data Availability

- Public pages request live menu data once and normalize it to the existing product shape.
- If that read fails, the bundled 101-product dataset remains available for read-only browsing.
- Checkout never reports success or clears the cart unless the live database confirms persistence.
- Existing static product route shells and SEO metadata remain compatible with stable slugs.

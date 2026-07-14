# Application Flow

## Discovery

`Home -> Menu category/search -> Product -> Add to cart -> Cart drawer -> Checkout`

## Checkout

`Cart -> Customer details -> Delivery or Takeaway -> Client validation -> Transactional create_order RPC -> Trusted confirmation -> Clear cart -> Copy details or Call Pommy`

The database validates current availability and prices, calculates the COD subtotal, creates the order and snapshot items atomically, and returns the trusted order number. A failure preserves the cart and never produces a fake success.

## Content Flow

`Home <-> Menu <-> Product` and `Blog article -> Menu/About/Contact` with persistent customer navigation and footer links on all public pages.

## Component Ownership

- Existing HTML/CSS: visual layout and Webflow interaction hooks.
- Central data: products, categories, prices, and temporary image references.
- Menu service: Supabase-first reads with the bundled dataset as display-only fallback.
- Shared site script: public navigation, branding, logo, cart drawer, common footer, and runtime behavior.
- Page scripts: menu, product, and checkout-specific rendering.

## Admin Flow

`Admin login -> Supabase session verification -> Admin allowlist check -> Dashboard`

`Dashboard -> Recent order -> Order details -> Explicit status selection -> Save`

`Admin menu -> Search/filter -> Edit approved fields -> Allowlist-checking RPC -> Public menu reflects live data`

Logged-out users return to `/admin/login/`. Authenticated users who are not allowlisted receive no admin data and are denied access by database policy.

## Order Data Flow

`localStorage cart IDs/quantities -> create_order RPC -> active menu rows locked/read -> trusted totals -> orders row + immutable order_items snapshots -> confirmation`

The idempotency token survives uncertain retries for the same checkout attempt. Historical names and prices are never recalculated from current menu rows.

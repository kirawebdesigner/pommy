# Pommy Burger and Pizza Website

## Problem

The current static Webflow export is a generic restaurant template. It must become a trustworthy, locally useful website for Pommy Burger and Pizza in Addis Ababa without changing the established visual design.

## Audience

- Customers looking for the menu, prices, location, phone number, dine-in, takeaway, or ordering information.
- Mobile visitors preparing an order for delivery or pickup.
- Search visitors looking for burgers, pizza, chicken, breakfast, drinks, and fast food in Addis Ababa.
- Pommy staff who need to receive COD orders and manage menu availability, prices, featured items, and order status.

## MVP

- Pommy branding and official logo throughout customer-facing pages.
- Customer navigation: Home, Menu, About, Blog, Contact, Cart, Order Now.
- Supabase-backed menu data containing exactly the approved 101 products and supplied ETB prices.
- Searchable, filterable menu and product details.
- Local persistent cart with transactional Cash on Delivery order submission.
- Immutable order-item name and price snapshots with server-calculated totals.
- Invite-only Supabase Auth admin access with an explicit database allowlist.
- Responsive admin dashboard for orders, status management, and approved menu fields.
- Accurate contact/location/service information.
- Pommy-focused blog, local SEO metadata, structured data, and accessible controls.
- Static, JavaScript-independent discovery content for Google and AI search tools.
- Local-search landing pages for burgers and pizza around CMC without creating spam city pages.
- Search Console verification, sitemap/robots/LLM discovery files, analytics readiness, and custom-domain portability.
- Preserve the current Webflow design, responsive behavior, and non-commerce interactions.

## Current Production Baseline

- Production is live at `https://pommydemo.netlify.app` with 101 Supabase-backed menu items, 10 categories, real COD order persistence, and allowlisted staff administration.
- Search discovery uses 115 indexable canonical URLs, statically generated content, a verified sitemap, crawler-readable robots directives, and permanent Google Search Console verification.
- Search appearance uses square Pommy favicon assets, a web manifest, and homepage `WebSite` naming signals for `Pommy Burger and Pizza` and `Pommy`.
- `/menu/` is a primary indexable route. Transactional `/checkout/` remains crawlable but is `noindex,follow`; admin, error, and obsolete template routes are excluded from indexing.

## Out Of Scope

- Online payments, customer accounts, social login, delivery-driver assignment, and public order history.
- Public-site redesign, framework migration, or changes to the verified Webflow IX2 motion system.
- Unsupported claims such as ratings, awards, opening hours, exact coordinates, social profiles, or delivery coverage.

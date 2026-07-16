# SEO, AEO, Analytics, And Domain Setup

## Current Production State

- Canonical site: `https://pommydemo.netlify.app`
- Production deployment verified on `https://pommydemo.netlify.app`.
- Search Console verification token: committed, generated on all 151 public pages, and confirmed exactly once in the raw production homepage source.
- Public HTML: statically prerendered with title, description, canonical, H1, primary content, links, and JSON-LD available without JavaScript.
- Indexable sitemap: 116 canonical URLs.
- Public page inventory: 151 generated HTML pages; obsolete/error/template-derived routes are `noindex,follow`.
- Demo safeguard: enabled by default. Checkout cannot call the real order RPC while `PUBLIC_DEMO_MODE=true`.
- Visual design and Webflow motion remain unchanged.
- Admin dashboard and order-list data refresh automatically every eight seconds and immediately after focus or connectivity returns.

## Central Configuration

`assets/config/seo-config.js` is the source of truth for:

- Canonical site URL
- Demo mode
- Analytics identifiers
- Google Search Console verification
- Business identity and description
- Phone, plus code, locality, region, and country
- Menu, order, contact, logo, and social-image paths
- Cuisine, service-area, currency, and payment facts
- Explicit `null` placeholders for unverified owner data

`scripts/generate-seo.cjs` writes `assets/config/public-runtime-config.js` and all generated metadata. Set build-time values in Netlify:

```text
PUBLIC_SITE_URL=https://pommydemo.netlify.app
PUBLIC_DEMO_MODE=true
PUBLIC_GA4_ID=
PUBLIC_GTM_ID=
```

The Search Console token is intentionally permanent in the centralized configuration and does not depend on a Netlify environment variable.

## Generated Search Assets

- `robots.txt`: permits public search and supported AI crawlers; disallows `/admin/`.
- `sitemap.xml`: contains 116 absolute canonical URLs with post dates where available.
- `llms.txt`: concise, factual business and route summary for AI retrieval.
- `SEO_METADATA.md`: generated route-by-route metadata, canonical, indexability, and schema inventory.
- `/burger-around-cmc/`: focused local burger landing page.
- `/pizza-around-cmc/`: focused local pizza landing page.
- `/location` redirects permanently to `/contact/`.
- `/order` redirects permanently to `/checkout/`.

## Structured Data

The generator emits one valid JSON-LD `@graph` per public page. Types are applied only where supported:

- `WebSite`
- `Organization`
- `Restaurant` and `LocalBusiness`
- `WebPage`, `CollectionPage`, or `Blog`
- `BreadcrumbList`
- `Menu`, `MenuSection`, `MenuItem`, and `Offer`
- `Product` and `Offer`
- `BlogPosting`
- `FAQPage` only on `/contact/`, where the same questions and answers are visible

No review, rating, award, coordinate, postal code, opening-hour, email, WhatsApp, or social-profile claims are generated without verified data.

## Analytics Readiness

`assets/js/analytics.js` works with GA4 directly or GTM and remains inert when neither ID is configured.

| Event | Trigger |
|---|---|
| `view_menu` | Menu/category page view |
| `select_item` | Product link selection |
| `add_to_cart` | Add-to-cart control |
| `begin_checkout` | Checkout page view |
| `click_whatsapp` | Verified WhatsApp link, when one exists |
| `click_call` | Telephone link |
| `get_directions` | Google Maps directions link |
| `submit_order` | Database-confirmed order submission |

Use either `PUBLIC_GTM_ID` or `PUBLIC_GA4_ID`. If both are supplied, GTM loads and direct GA4 loading is skipped to avoid duplicate collection.

## Google Search Console

1. Open Search Console and add the URL-prefix property `https://pommydemo.netlify.app/`.
2. Choose HTML tag verification.
3. Verify. The exact tag is present in the raw homepage source.
4. Submit `https://pommydemo.netlify.app/sitemap.xml`.
5. Inspect `/`, `/menu/`, `/contact/`, `/burger-around-cmc/`, and `/pizza-around-cmc/`.
6. Request indexing for those priority pages after verification.
7. Monitor Pages, Sitemaps, Core Web Vitals, Enhancements, and Manual Actions.

## Google Indexing Checklist

1. Confirm `robots.txt` and `sitemap.xml` return HTTP 200.
2. Confirm priority URLs return HTTP 200 with their own canonical.
3. Submit the sitemap in Search Console.
4. Request indexing for the homepage and primary local pages.
5. Do not request indexing for `/admin/`, `/401/`, `/404/`, utility pages, or old template-derived routes.
6. Recheck indexed URLs after Google processes the sitemap; indexing is controlled by Google and cannot be guaranteed by deployment.

## Verified Production Audit

- Homepage source: HTTP 200, one exact Google verification tag, and the canonical `https://pommydemo.netlify.app/`.
- `robots.txt`, `sitemap.xml`, `llms.txt`, `/burger-around-cmc/`, and `/pizza-around-cmc/`: HTTP 200.
- `/index.html`, `/location`, and `/order`: permanent canonical redirects.
- Live SEO browser gate: 8 rendered routes, 6 no-JavaScript routes, 116 sitemap URLs, zero console errors, and zero failed local requests.
- Live public gate: 12 representative routes and all 101 products with cart/checkout behavior, zero failed required local requests, zero runtime exceptions, and zero console errors.
- Live admin gate: authentication/authorization, dashboard, timed order auto-refresh, focus refresh, status mutation, menu mutation, and 390px overflow checks passed using mocked RPC responses against the deployed frontend assets.
- Live motion gate: no hidden targets, horizontal overflow, or browser errors at 1440, 1024, 768, and 390px; reduced-motion content remained immediately visible.

## Future Custom Domain

1. Add and verify the official domain in Netlify.
2. Set `PUBLIC_SITE_URL=https://official-domain.example` in the production build environment.
3. Run the full site generator. Canonicals, Open Graph URLs, sitemap URLs, robots sitemap reference, JSON-LD IDs, and `llms.txt` update from that one value.
4. Configure a permanent host-level redirect from `pommydemo.netlify.app` to the official hostname.
5. Add both domain and URL-prefix Search Console properties and submit the regenerated sitemap.
6. Verify HTTPS, one canonical hostname, trailing-slash redirects, and no redirect loops before requesting indexing.

## Demo Mode

Keep `PUBLIC_DEMO_MODE=true` while this deployment is unofficial. In demo mode:

- The checkout UI remains available for demonstration.
- `order-service.js` rejects submission before contacting Supabase.
- No payment is collected.
- No real order is created.

Set `PUBLIC_DEMO_MODE=false` only after Pommy approves the site, real ordering, staff monitoring, opening hours, delivery policy, and abuse controls.

## Owner Information Still Required

- Official street address and sub-city/woreda
- Geographic latitude and longitude
- Opening hours, including holiday exceptions
- Official WhatsApp number
- Public email address
- Official social profile URLs
- Official website domain
- Confirmed delivery/service areas
- Whether Cash on Delivery remains the only accepted payment method
- Confirmation of ambiguous supplied menu prices documented in `Tracker.md`

Until verified, these values remain `null`, omitted from schema, or explicitly described as unconfirmed.

## Commands

```powershell
.\scripts\build-pommy-site.ps1
npm run build
npm run test:seo
npm run audit
npm run test:browser
npm run test:seo:browser
npm run test:motion
```

Run browser commands against the local HTTP server configured for the project. Never validate the generated site only through `file://`.

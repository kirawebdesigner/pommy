# Tracker

## SEO, Local Search, And AI Discovery

- [x] Centralize canonical URL, verified Pommy facts, explicit unknown owner data, analytics settings, Search Console verification, and demo mode in `assets/config/seo-config.js`.
- [x] Generate one unique metadata set, canonical, robots directive, Open Graph/Twitter set, and JSON-LD graph for every public HTML page.
- [x] Permanently generate the verified Google Search Console token on all 151 public pages and confirm it in raw production HTML.
- [x] Generate a 116-URL canonical sitemap, crawler-safe `robots.txt`, factual `llms.txt`, and route-by-route `SEO_METADATA.md`.
- [x] Add high-value `/burger-around-cmc/` and `/pizza-around-cmc/` pages using the locked Pommy design and real menu records.
- [x] Add static prerendering so H1s, business facts, menu/product content, internal links, and structured data remain available without JavaScript.
- [x] Add optional GA4/GTM loading and stable events for menu views, product selection, add-to-cart, checkout start, order submission, calls, directions, and future verified WhatsApp links.
- [x] Add canonical route redirects, public/security/cache headers, custom-domain portability through `PUBLIC_SITE_URL`, and unofficial-order protection through `PUBLIC_DEMO_MODE`.
- [x] Document Search Console, indexing, analytics, custom-domain migration, demo mode, owner-data requirements, metadata inventory, schema inventory, and validation commands in `SEO_SETUP.md`.
- [x] Auto-refresh the admin dashboard and order list through the existing secured RPCs without granting direct browser access to customer-order tables.
- [x] Validate automatic admin refresh through both the eight-second timer and focus recovery; new orders and dashboard metrics update without a manual browser reload.
- [x] Pass the final static, database, public-browser, live-data, admin, SEO-browser, four-breakpoint motion, Netlify-build, and eight-width visual-regression gates.
- [x] Deploy the production build and verify the raw homepage source contains exactly one permanent Search Console tag.
- [x] Verify production `robots.txt`, `sitemap.xml`, `llms.txt`, local landing pages, canonical redirects, live admin refresh, and live public routes with zero required local-request failures, runtime exceptions, or console errors.

## Supabase And Admin Integration

- [x] Start from locked public baseline `aa69e3a530ae4905b3a7ff69662f2d7b6719aa87`; `main` matched `origin/main`; implementation is isolated on `feature/supabase-admin`.
- [x] Audit the canonical `assets/data/menu.js`: 101 unique product slugs, 10 categories, numeric ETB prices, existing descriptions/images, and four explicit featured flags.
- [x] Add four ordered migrations for the core schema, atomic/idempotent order RPC, allowlisted admin RPCs, strict grants, RLS, and policies.
- [x] Generate an idempotent seed from the canonical JavaScript dataset and assert exactly 10 categories and 101 products; preserve all current names, slugs, prices, images, descriptions, and known ambiguous values.
- [x] Add one browser Supabase client and centralized cached menu service with live normalized reads and a bundled display-only fallback.
- [x] Preserve the localStorage cart and replace demo order preparation with trusted transactional COD persistence; clear the cart only after confirmed database success.
- [x] Preserve all static product routes and load current price/availability by slug without changing the locked public composition or motion ownership.
- [x] Add isolated `/admin/login/`, `/admin/`, `/admin/orders/`, and `/admin/menu/` pages with email/password Auth, explicit allowlist verification, order details/status updates, and approved menu/category edits.
- [x] Add restrictive admin CSP/no-store/noindex headers and verify no service-role, database password, or management credential is present in browser code or Git.
- [x] Apply every migration and the seed to a clean PostgreSQL 17.10 test server: all SQL completed without errors and committed counts were 10 categories/101 menu items.
- [x] Pass rollback-only database behavior tests using real `anon` and `authenticated` roles: trusted subtotal, immutable snapshots, idempotent retries, unique order numbers, unavailable/missing/zero-quantity rejection, anonymous denial, non-admin denial, allowlisted dashboard/menu reads, server-side order search, order status update, and menu patch.
- [x] Pass deterministic seed check, migration static checks, 153-page recursive audit, 12-route/101-product browser regression, four-breakpoint motion suite, responsive admin suite, and pixel comparison against the locked baseline.
- [x] Pass a mocked live-Supabase public browser gate: 101 normalized rows, eight homepage showcase cards, live product price, unavailable-item removal/direct-route blocking, and zero browser errors.
- [x] Verify checkout's server-authoritative price-change notice, in-flight duplicate-submit lock, reload-safe idempotency token, bounded request timeout, failure-preserved cart, trusted order number/total, delivery/takeaway fields, and COD confirmation.
- [x] Verify admin browser behavior for safe POST-only login fallback, logged-out redirect, authenticated non-admin denial, allowlisted access, Nairobi timestamps, dashboard metrics, complete delivery details, server-side order search, order status save, and price/availability/featured/category/description/image menu updates with stable slug preservation.
- [x] Render live category labels with DOM text APIs and verify an admin-supplied markup payload remains inert on the public menu.
- [x] Restore the locked homepage parse-time `pommy-ix2-pending` guard in the generator/current homepage and extend it to the asynchronously inserted footer IX2 target without changing native timings, easing, mobile card ownership, or fallback behavior.
- [x] Pass the final 1440/1024/768/390 intermediate-state gate: 25/25 representative targets found, zero visible-before-hidden cases, zero stuck targets, zero errors, and 24 perceptible transitions; the gallery image remains intentionally static.
- [x] Pass the final four-breakpoint motion suite with zero fallback activations, hidden targets, horizontal overflow, or browser errors; reduced motion exposes all content immediately and disables slider autoplay.
- [x] Capture final 1440/1024/768/390 rendered states with identical document dimensions and zero hidden targets/errors/overflow. Mean absolute RGB differences versus the locked `production-fix-after` captures were 0.013478, 0.002186, 0.020158, and 0.008827; targeted gallery captures verified all six local images at every breakpoint.
- [x] Document environment setup, migration/seed order, first-admin allowlisting, tests, Netlify headers, production smoke checks, and the public RPC rate-limit boundary in `SUPABASE_SETUP.md`.
- [x] Link and verify Supabase project `cruvatqjbignywiwoszh`, apply migrations `20260714000100` through `20260714000400` in order, and apply the deterministic seed. The live database contains exactly 10 categories and 101 menu items.
- [x] Compare the live seed with `assets/data/menu.js`: canonical IDs/slugs, names, prices, and category relationships match; all remote category and menu-item UUIDs are valid and unique.
- [x] Verify the live `create_order` and RLS boundary with smoke order `POM-2026-00001`: trusted subtotal/snapshot pricing was 820 ETB, an identical token replay returned the same single order, mismatched token reuse returned HTTP 409, and anonymous direct order reads/writes and admin RPC access returned HTTP 401.
- [x] Verify confirmed Auth user `admin@pommy.menu` (`7f62b01d-1ded-4014-96b7-80fd74b073ce`), add it to `private.admin_users`, confirm allowlisted authenticated access to dashboard/101 menu items/10 categories, and confirm a non-allowlisted authenticated identity receives `admin_access_required`.
- [x] Deploy the verified feature branch to `https://pommydemo.netlify.app` (Netlify deploy `6a55a473bc2a11ca20b40698`) and complete production live-menu, real-order, allowlisted admin sign-in, and order status mutation verification with no errors.

### Security Hardening Note

The guest RPC validates all data, trusts only database prices, and exposes no customer reads, but a direct anonymous RPC cannot enforce trustworthy IP/device rate limits. Before high-volume public promotion, route order submission through a trusted Supabase Edge Function or server endpoint with bot verification/rate limiting and revoke direct anon RPC execution. This is not represented as implemented.

## Active Focus

- [x] Render and inspect the original template at 1440px, 1024px, 768px, and 390px.
- [x] Map the original homepage section hierarchy, dimensions, and Webflow interaction IDs.
- [x] Remove the compact polish layer and restore original-template homepage compositions.
- [x] Restore rich product, CTA, trust slider, editorial blog, contact, gallery, and footer sections.
- [x] Validate original interaction hooks and compare all required breakpoints.
- [x] Re-run full functional, accessibility, route, asset, and browser regression checks.

## Visible Motion Fidelity Follow-up

- [x] Treat the direct production observation that the page felt static as a motion-fidelity defect, independent of final-opacity and frame-stability metrics.
- [x] Compare fresh-load and natural-scroll intermediate states against the archived Restaurante X homepage at 1440px, 1024px, 768px, and 390px.
- [x] Diagnose the main perceptual race: 24 sampled desktop targets rendered at full opacity before IX2 applied its hidden initial state, so the later subtle reveal was visually undermined by a visible-before-hidden flash.
- [x] Add a homepage-only pre-paint ownership guard for the mapped native IX2 reveal targets; release it only after the IX2 session is active and has established its initial styles.
- [x] Add a deterministic IX2-unavailable state after the 10-second readiness deadline so content remains visible and a late runtime cannot hide it again.
- [x] Keep native IX2 as the desktop/tablet section owner and restrict the emergency fallback to mapped native reveal targets, a 1.8-second stable failure window, opacity-only repair, and one repair per target.
- [x] Replace the intentionally removed repeated-card IX2 IDs at 768px and 390px with one mobile-only `IntersectionObserver`: scale `0.97` to `1`, opacity `0` to `1`, 360ms restrained easing, and a maximum 60ms two-column stagger.
- [x] Keep browser-managed lazy image decoding; do not call `decode()` as cards cross the reveal boundary because performance traces showed decode bursts during scrolling.
- [x] Add observer feature detection, runtime reduced-motion cleanup, and stable-visible fallbacks; verify blocked IX2 and unavailable observer scenarios leave zero hidden content and do not interrupt cart initialization.
- [x] Before/after motion comparison: Pommy now matches the original template's animated target set at all four breakpoints; the original gallery image remains intentionally static in both versions.
- [x] Visible-order comparison: 1440px sampled targets improved from 24 visible-before-hidden cases to 0 while retaining intermediate opacity/transform progression.
- [x] Local traces: zero fallback activations, zero native writes after fallback, zero hidden native or lightweight targets, zero forced-reflow warnings, zero horizontal overflow, zero runtime/console errors, and negligible CLS (0 except 0.000006 at 1024px).
- [x] Local frame evidence: desktop/tablet p95 intervals remained about 17ms; a low-overhead 390px run at 4x CPU measured 33.4ms p95, while full DevTools traces varied from 47ms to 67ms under instrumentation overhead. No fixed frame-rate claim is made.
- [x] Headed Chrome wheel-scroll review confirms perceptible hero and card entrance choreography at desktop and mobile sizes without composition or content changes.
- [x] Product-link suite confirms no permanent title/action underlines, scoped hover/focus states, no layout shift, working product navigation, and unchanged cart behavior at all four breakpoints.
- [x] Local regression: 182 HTML pages, 101 products, 10 categories, 6 posts, zero broken local references, 12 representative routes passed, and zero failed local requests or browser errors.
- [x] Deploy commit `edc1c13` to `https://pommydemo.netlify.app`; Netlify deploy `6a55656b269d7b0008562e76` is ready and references the exact commit.
- [x] Live intermediate-state comparison at 1440px, 1024px, 768px, and 390px matches the original template's animated target set, with zero visible-before-hidden cases, zero missing targets, and zero browser errors.
- [x] Live traces: zero fallback activations, zero writes after fallback, zero hidden targets, zero forced-reflow warnings, zero overflow, zero console/runtime errors, and CLS of 0 except 0.000010 at 1024px. Desktop/tablet p95 intervals were 17.26-17.84ms; the fully instrumented 4x CPU mobile trace measured 50ms p95 and four scroll-window long tasks.
- [x] Final live motion/link suite passed all four breakpoints, reduced-motion, slider keyboard input, mobile navigation, product hover/focus states, cart updates, and product navigation.
- [x] Final live regression passed 12 representative routes and all 101 products with cart/checkout behavior unchanged, zero failed required requests, zero runtime exceptions, and zero console errors.
- [x] Final headed Chrome wheel-scroll inspection confirms clearly perceptible hero and section entrance motion on desktop and mobile without visual composition changes.
- [x] Completion-audit headed journey exposed a mobile-menu false positive: Webflow reported the open menu visible, but Pommy's higher-specificity `top: 100%` rule positioned it at the bottom of the full-document-height navigation overlay (about 17,842px offscreen at 390px).
- [x] Restore the original Webflow open-overlay geometry with one mobile-scoped rule: `.w-nav-overlay .nav-menu.w-nav-menu[data-nav-menu-open] { top: 0; }`.
- [x] Verify locally at 768px and 390px that the animated menu opens directly below the header, all five links remain inside the viewport, closing hides the panel, and no overflow or browser error occurs.
- [x] Strengthen `validate-motion-links.cjs` to reject offscreen mobile menus and links instead of accepting `display: block` as sufficient evidence.
- [x] Deploy commit `101cc57` as Netlify deploy `6a556b983ca33e00091315fb`; repeat the geometry-aware suite at 1440px, 1024px, 768px, and 390px with zero hidden targets, fallback repairs, overflow, or errors.
- [x] Final headed production inspection confirms the open menu spans `112-436px` at 768 and `96-420px` at 390, all five links are inside the viewport, the Lottie close state is visible, and closing hides the panel.
- [x] Final production regression after the navigation fix passed 12 representative routes and all 101 products with zero failed requests, runtime exceptions, or console errors.

## Production Asset And Hero Fix

- [x] Confirm the seven broken live URLs on `https://pommydemo.netlify.app` returned HTTP 404.
- [x] Identify root cause: `.gitignore` pattern `template/` also ignored `assets/images/template/`, so the locally present SVGs never entered Git or the Netlify deploy.
- [x] Preserve and relocate the original template SVG bytes to `assets/icons/burger.svg`, `pizza.svg`, `chicken.svg`, `wrap.svg`, `location.svg`, `phone.svg`, and `menu.svg`.
- [x] Change all active generated references to root-relative `/assets/icons/...` URLs with exact lowercase filename matching.
- [x] Verify all seven production icons are Git tracked in the index with distinct Git blob records; deployment inclusion is verified after publish below.
- [x] Rebalance the existing desktop hero through scoped container, column, copy-width, paragraph-width, and alignment rules without changing its content, image, typography, orange geometry, section scale, or interactions.
- [x] At 1440px, verify a two-line heading, `144px` copy inset, `517px` rendered image width, and exact copy/image vertical-center alignment at `573px`.
- [x] At 1024px, verify a two-line heading, aligned copy/image centers, and no collision; preserve the existing 768px and 390px responsive compositions.
- [x] Capture before screenshots in `.codex-screenshots/production-fix-before/` and after screenshots in `.codex-screenshots/production-fix-after/`.
- [x] Audit all 149 active routes over HTTP: 0 broken DOM images, 0 failed image requests, 0 bad image responses, and 0 failed local image fetches.
- [x] Pass the full route/search/cart/checkout/Webflow/mobile regression suite with 0 local request failures, 0 runtime exceptions, and 0 console errors.
- [x] Verify the deployed `/assets/icons/...` URLs and live customer-facing image audit after Netlify publishes the deployment commit.

## Motion And Product Link Quality

- [x] Diagnose the motion conflict with Chrome traces: the previous broad fallback wrote opacity and removed transforms after 700ms, overlapping healthy IX2 action lists whose native delay and transition can run for roughly 1.1s.
- [x] Give native IX2 exclusive first opportunity to initialize and complete; fallback observation now starts only after the IX2 session is active and at the native 25% scroll boundary.
- [x] Batch stuck-target sampling every 160ms, require at least 1.4s plus three stable checks, recheck after image decoding, resolve each target once, and disconnect it from observation.
- [x] Restrict fallback repair to a 260ms opacity-only recovery. It never removes, resets, or animates an IX2 transform.
- [x] Remove the concurrent eager decode experiment after traces showed it created decode bursts; keep browser-managed native lazy loading and default decoding for below-fold media.
- [x] Preserve the hero as eager/high-priority media with explicit intrinsic dimensions and preload the hero image and local DM Sans font.
- [x] Add reduced-motion behavior that exposes all IX2 targets immediately, suppresses transforms/transitions, preserves the hero's static rotation, swaps the Lottie menu icon for the static local icon, and disables slider autoplay.
- [x] Remove permanent underlines only from Pommy product titles, homepage Add to cart actions, and menu View actions; preserve scoped hover color and high-contrast two-tone keyboard focus states.
- [x] Correct the trace observer so mutation recording does not call `getComputedStyle()` or `getBoundingClientRect()` on every IX2 style write.
- [x] Local performance traces at 1440, 1024, 768, and 390px: zero fallback activations, zero hidden targets, zero native writes after fallback, zero forced-reflow warnings, zero overflow, zero console/runtime errors, and CLS of 0 except 0.000006 at 1024px.
- [x] At 768px and below, remove IX2 IDs only from repeated category, product, and supporting-blog cards before Webflow initializes; headings, hero, slider, navigation, and section reveals remain native while large repeated card groups appear immediately.
- [x] Local desktop/tablet trace p95 frame intervals were 16.97ms at 1440px and 17.15ms at 768px. The final 4x CPU mobile run improved from 66.68ms p95 and 20 scroll-window long tasks to 33.36ms p95 and 6 scroll-window long tasks; no fixed 60 FPS claim is made.
- [x] Four-breakpoint browser validation confirms clean wrapped titles, no permanent product-action underlines, hover without size shift, visible keyboard focus, working product navigation/cart, working slider arrows/mobile navigation, and zero hidden targets.
- [x] Reduced-motion emulation at 390px confirms immediate visibility, disabled slider autoplay, zero fallback activations, and no animation-dependent hidden content.
- [x] Deploy commits `0e2430c` and `98e48ea` and verify the final production bundle on `https://pommydemo.netlify.app`.
- [x] Final live traces: 1440px p95 17.05ms, 1024px 17.16ms, 768px 17.27ms, and 390px at 4x CPU 33.23ms. Desktop/tablet recorded zero scroll-window long tasks; throttled mobile recorded two.
- [x] Final live traces at every breakpoint recorded zero fallback activations, zero writes after fallback, zero hidden targets, zero forced-reflow warnings, zero horizontal overflow, and zero console/runtime errors. CLS was 0 at 1440px/390px and below 0.000016 at 1024px/768px.
- [x] Final live motion/link suite passed at all four breakpoints, including slider keyboard input, mobile menu open/close, product hover/focus states, cart updates, and reduced-motion emulation.
- [x] Final live full regression passed 12 representative routes and all 101 products with cart persistence, quantity controls, delivery/pickup COD preparation, zero failed required local requests, zero runtime exceptions, and zero console errors.

## Performance, Accessibility, Headers, And Crawler Metadata

- [x] Record the uncontaminated production reference (desktop Performance 91, Accessibility 97, Best Practices 96, SEO 100; FCP 0.9s, LCP 1.3s, TBT 80ms, CLS 0.076, Speed Index 1.9s) and exclude the extension/cache/IndexedDB-contaminated 27 run from decisions.
- [x] Map active image and script ownership. Webflow remains required for IX2, slider, mobile navigation, Lottie, and original interaction choreography; it was preserved unchanged.
- [x] Generate responsive local WebP variants for active menu photography and 128/256px logo variants while retaining original JPEG/PNG fallbacks. The hero remains eager, high priority, explicitly sized, and HTML-discoverable; below-fold media remains lazy.
- [x] Split generated scripts by route so menu, product, checkout, order, Supabase, and blog code loads only where consumed. All 151 generated public pages use the generator as source of truth.
- [x] Preserve the pre-paint IX2 ownership guard and start Webflow from `Pommy.motionReady` instead of waiting for Supabase. The prerendered homepage remains stable while its eight featured cards reconcile in place with authoritative live data.
- [x] Correct invalid product-list/cart ARIA, add intrinsic dimensions to active images/icons, and apply only measured WCAG-safe orange variants (`#c24b08` for normal text/white controls and `#e95d11` for the large hero accent).
- [x] Add Netlify `nosniff`, referrer, permissions, frame, COOP, and tested CSP definitions. The CSP hashes exactly match the generated pre-paint and Webflow-loader inline scripts.
- [x] Repair `robots.txt` and Markdown `llms.txt`; public crawl routes remain allowed while `/admin/` and `/checkout/` are excluded.
- [x] Local static gates: 155 HTML pages, 101 products, 10 categories, 6 posts, 116 sitemap URLs, zero broken local references, zero missing image dimensions, and Supabase seed parity across four migrations.
- [x] Local browser gates: 12 representative routes, 101 products, eight live featured cards, authoritative price/unavailable behavior, cart/checkout, admin authorization/mutations/auto-refresh, and SEO browser validation all pass with zero failed required requests, runtime exceptions, or console errors.
- [x] Local motion gates at 1440, 1024, 768, and 390px retain perceptible native reveals, zero reveal-fallback activations, zero visible-before-hidden events on the guarded ownership set, zero stuck targets in natural scrolling, mobile lightweight card reveals, reduced-motion visibility, and zero horizontal overflow.
- [x] Local Lighthouse diagnostic reached Accessibility 100, Best Practices 100, and SEO 100. Three-run production medians remain pending until the linked Netlify build is live.
- [ ] Verify the linked Netlify deploy headers, CSP, crawler files, Supabase, checkout/admin, visuals, images, and motion, then record three clean desktop/mobile Lighthouse runs and medians.

## Superseded Compact Polish

- [x] The rejected compact `pommy-polish.css` direction and its page-height reductions were removed.
- [x] The current restored Restaurante X compositions supersede the prior compact-polish screenshots and geometry claims.

- [x] Read the full task specification and inspect the official logo.
- [x] Audit the current project structure and confirm no usable Git repository.
- [x] Create external rollback archive.
- [x] Capture baseline screenshots and map reusable page structures.
- [x] Add canonical Pommy business and menu data.
- [x] Rebrand public pages and navigation without redesign.
- [x] Implement menu search/filter and product details.
- [x] Implement standalone cart and checkout.
- [x] Replace generic blog content.
- [x] Complete SEO and accessibility pass.
- [x] Run full HTTP/browser validation and fix regressions.

## Final Verification

- [x] Static audit: 149 HTML pages, 101 products, 10 visible categories, 6 blog posts.
- [x] Asset and route audit: zero broken local references and exact uploaded-logo match.
- [x] Customer-source audit: zero forbidden generic-template, AR, BRIX, USD, or obsolete Webflow export matches.
- [x] Browser flow suite: 12 representative routes, cart, checkout, search/filter, hover, and mobile navigation passed.
- [x] Browser runtime audit: zero failed local requests, runtime exceptions, console errors, or screenshot failures.
- [x] Desktop and mobile screenshots captured in `.codex-screenshots/pommy-after/`.

## Known Data Review

- Duplicate prices for Double Peanut Tea and Double Fasting Macchiato require Pommy confirmation.
- Peanut at 1330 ETB is retained as supplied but requires confirmation.
- No exact Google Maps URL, email, opening hours, social profiles, or live order receiver is confirmed.

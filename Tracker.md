# Tracker

## Active Focus

- [x] Render and inspect the original template at 1440px, 1024px, 768px, and 390px.
- [x] Map the original homepage section hierarchy, dimensions, and Webflow interaction IDs.
- [x] Remove the compact polish layer and restore original-template homepage compositions.
- [x] Restore rich product, CTA, trust slider, editorial blog, contact, gallery, and footer sections.
- [x] Validate original interaction hooks and compare all required breakpoints.
- [x] Re-run full functional, accessibility, route, asset, and browser regression checks.

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
- [ ] Deploy the focused motion/link changes and repeat performance traces and browser validation on `https://pommydemo.netlify.app`.

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

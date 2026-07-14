# Implementation Plan

1. Audit the export, capture baseline screenshots, and create an external rollback archive.
2. Add the official logo, central business/menu data, and ambiguity review file.
3. Apply Pommy branding, customer navigation, footer, homepage, About, Contact, SEO, and utility-page indexing rules.
4. Implement menu search/category browsing and static product detail routes.
5. replace Webflow ecommerce behavior with a local cart while preserving the existing drawer presentation.
6. Implement cash-on-delivery checkout preparation and order service abstraction.
7. Replace generic blog content with six Pommy articles and useful internal links.
8. Validate recursive text/link/resource invariants, ordering flows, responsive behavior, accessibility, console/network health, and visual preservation.
9. Apply a scoped visual-polish layer, compare the homepage at 1440px, 1024px, 768px, and 390px, and rerun the full browser regression suite.
10. Reverse the compact polish direction and restore the original Restaurante X homepage compositions around the completed Pommy system.
11. Lock commit `aa69e3a` as the public visual/motion baseline and create `feature/supabase-admin`.
12. Add versioned Supabase schema, strict grants/RLS, admin allowlist, collision-safe order numbers, and atomic idempotent order creation.
13. Generate deterministic category/menu seed SQL from the canonical 101-product dataset and verify exact field parity.
14. Add one browser Supabase client and a centralized menu service with read-only bundled fallback.
15. Connect homepage, menu, and product shells to live normalized data without changing markup, styling, routes, or motion ownership.
16. Replace local prepared orders with real COD persistence, trusted totals, duplicate-submit protection, and failure-safe cart handling.
17. Build isolated static admin login, dashboard, order/status management, and approved menu editing.
18. Validate database constraints, RLS roles, idempotency, snapshots, public flows, admin flows, and all 101 products.
19. Run screenshot and motion regression gates at 1440px, 1024px, 768px, and 390px before deployment.
20. Apply migrations, create the first allowlisted admin through a trusted channel, deploy, and verify the live Netlify/Supabase integration.

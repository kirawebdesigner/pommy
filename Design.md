# Pommy Design System

The July 2026 editorial restaurant redesign is the public visual source of truth.

- Preserve DM Sans, the official Pommy logo, the orange/cream/black identity, the real food photography, and the established Restaurante X-derived section sequence.
- Use a bold Addis Ababa fast-food editorial language: oversized food media, controlled asymmetry, strong black rules, tactile bordered cards, yellow price accents, and restrained cream surfaces.
- Keep design variance high, motion moderate, and density balanced (`8 / 6 / 4`). Do not collapse the page into a compact SaaS layout or return to generic equal-card grids.
- Reuse existing Webflow classes, containers, and IX2 hooks. The scoped redesign source is `assets/css/pommy-redesign.css`; do not rewrite the generated Webflow stylesheet.
- Use the official uploaded circular red Pommy logo without recoloring, redrawing, cropping, or distortion.
- Keep card corners restrained at 8px and reserve full pills for buttons, price/count badges, and filter controls.
- New menu, cart, and checkout controls must inherit the same tactile editorial restaurant language.
- Keep visible keyboard focus and sufficient control sizing on mobile.
- Do not add gradients, glassmorphism, decorative blobs, AR, 3D, or unrelated visual effects.

## Component Ownership

- Astryx is installed and used as an isolated React island for the global cart control. It must not replace the static/Webflow page architecture or require a framework conversion.
- The no-JavaScript cart fallback remains in generated HTML. `src/astryx-islands.jsx` enhances it after load and listens to the existing `pommy:cart-changed` contract.
- The homepage remains native Webflow IX2 territory. `assets/js/pommy-redesign.js` may reveal generated non-homepage content only and must not compete with native homepage interactions.
- Header controls should fit within a compact approximately 80px desktop bar. Menu search/filter tools remain in normal document flow and must never cover product cards while scrolling.

## Original Template Restoration

- Treat `template/home/index.html` and its rendered captures as the composition source of truth.
- Preserve the original large section scale, asymmetry, orange geometry, image dominance, editorial grids, slider structure, and whitespace rhythm.
- Reuse original Webflow classes, hierarchy, and `data-w-id` hooks wherever Pommy content replaces template content.
- Keep Pommy data, accessibility, navigation, cart, checkout, blog, SEO, and local assets intact.
- Do not reintroduce template branding, fake testimonials, reservation claims, external social claims, or obsolete ecommerce behavior.

## SEO Visual Lock

- Metadata, semantics, static prerendering, analytics hooks, and structured data must not alter rendered geometry.
- Local landing pages reuse existing Pommy sections, cards, buttons, typography, and responsive rules.
- Do not add visible keyword blocks or hidden SEO text.
- Any future demo notice must be small, truthful, accessible, and approved against the locked visual baseline.

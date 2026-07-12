# Design Preservation Rules

The current working website is the visual source of truth.

- Preserve existing DM Sans typography, spacing, colors, shadows, radii, section order, image treatment, button styles, hover states, and responsive behavior.
- Reuse existing Webflow classes and containers; do not mass-rename or rewrite the stylesheet.
- Use the official uploaded circular red Pommy logo without recoloring, redrawing, cropping, or distortion.
- New menu, cart, and checkout controls must visually inherit the current neutral/red restaurant design.
- Keep visible keyboard focus and sufficient control sizing on mobile.
- Do not add AR, 3D, gradients, decorative effects, or a new design system.

## Original Template Restoration

- Treat `template/home/index.html` and its rendered captures as the composition source of truth.
- Preserve the original large section scale, asymmetry, orange geometry, image dominance, editorial grids, slider structure, and whitespace rhythm.
- Reuse original Webflow classes, hierarchy, and `data-w-id` hooks wherever Pommy content replaces template content.
- Keep Pommy data, accessibility, navigation, cart, checkout, blog, SEO, and local assets intact.
- Do not reintroduce template branding, fake testimonials, reservation claims, external social claims, or obsolete ecommerce behavior.

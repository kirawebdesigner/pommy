# Technical Specification

## Stack

- Static HTML pages served over HTTP.
- Existing Webflow CSS and runtime retained where required for layout, navbar animation, and interactions.
- Local vanilla JavaScript for menu rendering, product details, cart, checkout, and order preparation.
- `localStorage` for cart persistence and demo prepared orders.
- No backend, authentication, database, framework migration, or payment gateway.

## Modules

- `assets/data/menu.js`: canonical menu records with numeric ETB prices.
- `assets/config/order-config.js`: order channel and verified Pommy contact configuration.
- `assets/js/pommy-site.js`: shared branding, navigation, footer, cart, accessibility, and page bootstrapping.
- `assets/js/menu-page.js`: filtering/search and product listing.
- `assets/js/product-page.js`: product detail rendering and add-to-cart behavior.
- `assets/js/checkout-page.js`: checkout UI and validation.
- `assets/js/order-service.js`: structured order creation, local demo storage, formatting, and copy support.
- `assets/css/pommy-site.css`: scoped additions that reuse the existing visual language.

## Security And Data

- No card data is requested or stored.
- User-entered checkout data remains local in the browser unless a future configured channel is added.
- Render dynamic content with DOM APIs and `textContent` where possible.
- Ethiopian-style phone validation accepts local `09...` and international `+2519...` forms.

## Routes

- Primary: `/`, `/menu/`, `/about/`, `/blog/`, `/contact/`, `/checkout/`.
- Product details: `/product/<slug>/`.
- Blog details: `/blog-posts/<slug>/`.
- Utility pages remain unlinked and `noindex`.


# Application Flow

## Discovery

`Home -> Menu category/search -> Product -> Add to cart -> Cart drawer -> Checkout`

## Checkout

`Cart -> Customer details -> Delivery or Pickup -> Validation -> Prepare order -> Order prepared -> Copy details or Call Pommy`

No live restaurant receipt is claimed because no backend or confirmed messaging channel is configured.

## Content Flow

`Home <-> Menu <-> Product` and `Blog article -> Menu/About/Contact` with persistent customer navigation and footer links on all public pages.

## Component Ownership

- Existing HTML/CSS: visual layout and Webflow interaction hooks.
- Central data: products, categories, prices, and temporary image references.
- Shared site script: public navigation, branding, logo, cart drawer, common footer, and runtime behavior.
- Page scripts: menu, product, and checkout-specific rendering.


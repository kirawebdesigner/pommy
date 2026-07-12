# Project Guardrails

- Do not redesign, rebuild, or migrate the static site to a framework.
- Preserve existing Webflow visual classes and interaction runtime where still required.
- Do not invent business facts, prices, products, reviews, hours, addresses, delivery coverage, email, social profiles, or payment integrations.
- Use only supplied Pommy facts and the official uploaded logo.
- Keep menu prices numeric in the central data source and format them as ETB at render time.
- Keep cart/order logic modular and out of individual HTML pages.
- Do not claim a restaurant received an order without a configured receiver.
- Do not add AR, 3D food previews, `model-viewer`, or Three.js.
- Use semantic controls, explicit labels, visible focus, and useful validation messages.
- Preserve unrelated user files and avoid destructive Git/filesystem operations.


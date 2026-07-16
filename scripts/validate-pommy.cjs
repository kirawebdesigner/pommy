const { chromium } = require("playwright");

const base = process.argv[2] || process.env.POMMY_BASE_URL || "http://127.0.0.1:8098";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const isRemote = /^https:\/\//i.test(base);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(isRemote ? 60000 : 15000);
  context.setDefaultNavigationTimeout(60000);
  const failures = [];
  const consoleErrors = [];
  const pageErrors = [];

  async function prepare(page, options = {}) {
    if (options.demoMode === false) {
      await page.addInitScript(() => {
        var config;
        Object.defineProperty(window, "POMMY_SEO_CONFIG", {
          configurable: true,
          get: function () { return config; },
          set: function (value) { config = Object.freeze(Object.assign({}, value, { demoMode: false })); }
        });
      });
    }
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (options.demoMode === false && url.origin === base && url.pathname === "/assets/config/public-runtime-config.js") {
        return route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: '(function(){window.POMMY_PUBLIC_ENV=Object.freeze({PUBLIC_SITE_URL:"https://pommydemo.netlify.app",PUBLIC_DEMO_MODE:false,PUBLIC_GA4_ID:"",PUBLIC_GTM_ID:"",PUBLIC_GOOGLE_SITE_VERIFICATION:""});})();'
        });
      }
      if (url.origin === base) return route.continue();
      return route.abort();
    });
    page.on("console", message => {
      if (message.type() === "error" && !/ERR_FAILED/.test(message.text())) consoleErrors.push(message.text());
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => {
      const url = new URL(request.url());
      const errorText = request.failure()?.errorText || "";
      if (url.origin === base && errorText !== "net::ERR_ABORTED") failures.push(`${request.url()} (${errorText})`);
    });
  }

  const routes = [
    "/", "/about/", "/menu/", "/product/pommy-special-burger/", "/category/breakfast/",
    "/blog/", "/blog-posts/burger-lovers-guide-to-pommy/", "/checkout/", "/contact/",
    "/delivery/", "/utility-pages/start-here/", "/404/"
  ];

  for (const route of routes) {
    const page = await context.newPage();
    await prepare(page);
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(response && response.status() === 200, `${route} did not return 200`);
    await page.locator("#main-content").waitFor({ state: "attached" });
    const bodyText = await page.locator("body").innerText();
    assert(!/Restaurante X|Los Angeles|\$\s*\d|\bUSD\b|View in AR|augmented reality/i.test(bodyText), `${route} exposes generic template, USD, or AR text`);
    assert(await page.locator(".w-commerce-commercecartwrapper").count() === 0, `${route} still has a Webflow cart`);
    assert(await page.locator(".w-webflow-badge, a[href*='webflow.io'], a[href*='brixtemplates']").count() === 0, `${route} exposes a Webflow or template-provider badge/link`);
    assert(await page.locator('img[alt="Pommy Burger and Pizzeria logo"]').count() >= 2, `${route} is missing Pommy logos`);
    assert(await page.locator(".nav-menu a").allTextContents().then(items => items.join("|") === "Home|Menu|About|Blog|Contact"), `${route} has incorrect customer navigation`);
    const accessibility = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(element => Number(element.tagName.slice(1)));
      const ids = Array.from(document.querySelectorAll("[id]")).map(element => element.id).filter(Boolean);
      const controlsWithoutLabels = Array.from(document.querySelectorAll("input:not([type='hidden']), select, textarea")).filter(control => !control.labels?.length && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")).map(control => control.id || control.name || control.type);
      const buttonsWithoutNames = Array.from(document.querySelectorAll("button,[role='button']")).filter(control => !(control.innerText || "").trim() && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")).length;
      return {
        h1Count: document.querySelectorAll("h1").length,
        missingAlts: Array.from(document.images).filter(image => !image.hasAttribute("alt") || !image.alt.trim()).length,
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        controlsWithoutLabels,
        buttonsWithoutNames,
        headingJumps: headings.filter((level, index) => index > 0 && level - headings[index - 1] > 1)
      };
    });
    assert(accessibility.h1Count === 1, `${route} does not have exactly one H1`);
    assert(accessibility.missingAlts === 0, `${route} has images without useful alt text`);
    assert(accessibility.duplicateIds.length === 0, `${route} has duplicate IDs: ${accessibility.duplicateIds.join(", ")}`);
    assert(accessibility.controlsWithoutLabels.length === 0, `${route} has unlabeled form controls: ${accessibility.controlsWithoutLabels.join(", ")}`);
    assert(accessibility.buttonsWithoutNames === 0, `${route} has unnamed buttons`);
    assert(accessibility.headingJumps.length === 0, `${route} skips heading levels`);
    await page.close();
  }

  const home = await context.newPage();
  await prepare(home);
  await home.goto(base + "/", { waitUntil: "domcontentloaded" });
  await home.waitForFunction(() => {
    try { return Boolean(window.Webflow?.require("ix2")?.store?.getState().ixSession.active); }
    catch (error) { return false; }
  });
  assert(await home.locator("#main-content > section").count() === 10, "Homepage does not preserve the original ten-section composition");
  assert(await home.locator(".card.menu-category-card").count() === 4, "Homepage category card composition is incomplete");
  assert(await home.locator(".pommy-original-menu-card").count() === 8, "Homepage does not show the original eight-item menu showcase");
  assert(await home.locator("a.card.blog-card.featured-blog").count() === 1, "Homepage featured article is missing");
  assert(await home.locator("a.card.blog-card:not(.featured-blog)").count() === 4, "Homepage supporting editorial grid is incomplete");
  assert(await home.locator(".pommy-gallery-section .instagram-image").count() === 6, "Homepage food mosaic is incomplete");
  assert(await home.locator(".footer .instagram-footer-grid .instagram-image").count() === 4, "Footer food mosaic is incomplete");
  const composition = await home.evaluate(() => {
    const hero = document.querySelector(".section.home-hero").getBoundingClientRect();
    const heroBg = document.querySelector(".bg.home-hero").getBoundingClientRect();
    const cta = document.querySelector(".section.cta-v1").getBoundingClientRect();
    const ctaImage = document.querySelector(".image-wrapper.cta-v1-image").getBoundingClientRect();
    return { heroHeight: hero.height, heroBgRatio: heroBg.width / hero.width, ctaImageRatio: ctaImage.width / cta.width };
  });
  assert(composition.heroHeight >= 800, "Homepage hero lost the original vertical scale");
  assert(composition.heroBgRatio >= .38, "Homepage hero lost the original orange geometry");
  assert(composition.ctaImageRatio >= .46, "Homepage CTA lost the original split image composition");
  await home.locator('[data-w-id="e4c3bb7f-ac95-699e-bd63-e013c6263f86"]').scrollIntoViewIfNeeded();
  await home.waitForFunction(() => Number.parseFloat(getComputedStyle(document.querySelector('[data-w-id="e4c3bb7f-ac95-699e-bd63-e013c6263f86"]')).opacity) >= .85);
  const activeSlide = () => home.locator(".pommy-trust-card").evaluateAll(cards => cards.findIndex(card => card.closest(".w-slide").getAttribute("aria-hidden") !== "true"));
  await home.locator(".pommy-trust-card").first().scrollIntoViewIfNeeded();
  const activeBefore = await activeSlide();
  await home.locator(".slider-arrow-v1.right").click();
  await home.waitForFunction(previous => Array.from(document.querySelectorAll(".pommy-trust-card")).findIndex(card => card.closest(".w-slide").getAttribute("aria-hidden") !== "true") !== previous, activeBefore);
  await home.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  assert(await home.locator("[data-cart-count]").first().innerText() === "1", "Homepage original-style product card does not add to cart");
  await home.evaluate(() => localStorage.removeItem("pommy_cart_v1"));
  await home.close();

  const menuPage = await context.newPage();
  await prepare(menuPage);
  await menuPage.goto(base + "/menu/", { waitUntil: "domcontentloaded" });
  await menuPage.waitForFunction(() => document.querySelectorAll(".pommy-menu-card").length === 101);
  assert(await menuPage.locator(".pommy-menu-card").count() === 101, "Menu does not render all 101 public products");
  await menuPage.getByLabel("Search the menu").fill("chicken");
  const chickenCount = await menuPage.locator(".pommy-menu-card").count();
  assert(chickenCount > 5, "Chicken search returned too few results");
  await menuPage.getByLabel("Search the menu").fill("");
  await menuPage.getByRole("button", { name: "Burger", exact: true }).click();
  assert(await menuPage.locator('.pommy-menu-card[data-category="burger"]').count() === 9, "Burger filter is incorrect");
  assert(await menuPage.locator('[data-w-id="770cf311-3a76-a0f9-0c48-8b6b85d6c484"]').count() === 9, "Menu cards are missing the original Webflow scroll-interaction hook");
  const hoverButton = menuPage.locator(".pommy-menu-card .button-primary").first();
  const hoverBefore = await hoverButton.evaluate(element => {
    const style = getComputedStyle(element);
    return style.transform + "|" + style.boxShadow;
  });
  await hoverButton.hover();
  await menuPage.waitForFunction(([element, before]) => {
    const style = getComputedStyle(element);
    return style.transform + "|" + style.boxShadow !== before;
  }, [await hoverButton.elementHandle(), hoverBefore]);
  await menuPage.close();

  const cartPage = await context.newPage();
  await prepare(cartPage);
  await cartPage.goto(base + "/product/pommy-special-burger/", { waitUntil: "domcontentloaded" });
  await cartPage.getByLabel("Quantity").fill("2");
  await cartPage.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "2", "Cart count did not update after add");
  assert(await cartPage.locator("[data-cart-subtotal]").innerText() === "1,978 ETB", "Cart subtotal is incorrect after add");
  await cartPage.reload({ waitUntil: "domcontentloaded" });
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "2", "Cart did not persist after reload");
  await cartPage.locator(".pommy-cart-open").click();
  await cartPage.getByRole("button", { name: /Increase Pommy Special Burger quantity/ }).click();
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "3", "Cart increase failed");
  await cartPage.getByRole("button", { name: /Decrease Pommy Special Burger quantity/ }).click();
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "2", "Cart decrease failed");
  await cartPage.getByRole("button", { name: /Remove Pommy Special Burger from cart/ }).click();
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "0", "Cart remove failed");
  await cartPage.evaluate(() => { window.Pommy.addToCart("beef-burger", 1); window.Pommy.addToCart("chicken-bbq-pizza", 1); });
  await cartPage.getByRole("button", { name: "Clear cart" }).click();
  assert(await cartPage.locator("[data-cart-count]").first().innerText() === "0", "Clear cart failed");
  await cartPage.close();

  const checkout = await context.newPage();
  await prepare(checkout, { demoMode: false });
  const submittedOrders = [];
  await checkout.route("**/rest/v1/rpc/create_order", async route => {
    const payload = route.request().postDataJSON();
    submittedOrders.push(payload);
    const prices = { "chicken-bbq-pizza": 1250, "beef-burger": 820 };
    const items = payload.p_items.map(item => ({
      menu_item_id: "00000000-0000-4000-8000-000000000001",
      product_name: item.slug === "beef-burger" ? "Beef Burger" : "Chicken BBQ Pizza",
      unit_price: prices[item.slug],
      quantity: item.quantity,
      line_total: prices[item.slug] * item.quantity
    }));
    await new Promise(resolve => setTimeout(resolve, 75));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000010",
        order_number: "POM-2026-00001",
        order_type: payload.p_order_type,
        subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
        payment_method: "cash_on_delivery",
        status: "new",
        created_at: "2026-07-14T00:00:00Z",
        items
      })
    });
  });
  await checkout.goto(base + "/product/chicken-bbq-pizza/", { waitUntil: "domcontentloaded" });
  await checkout.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await checkout.goto(base + "/checkout/", { waitUntil: "domcontentloaded" });
  await checkout.getByRole("button", { name: "Place Order" }).click();
  assert(await checkout.locator("#pommy-checkout-errors").isVisible(), "Checkout did not show validation errors");
  await checkout.getByLabel("Full Name").fill("Test Customer");
  await checkout.getByLabel("Phone Number").fill("0956905484");
  await checkout.getByLabel("Delivery", { exact: true }).check();
  assert(await checkout.locator("#pommy-delivery-fields").isVisible(), "Delivery fields did not appear");
  await checkout.getByRole("button", { name: "Place Order" }).click();
  assert((await checkout.locator("#pommy-checkout-errors").innerText()).includes("delivery area"), "Delivery validation is incomplete");
  await checkout.getByLabel("Delivery Area").fill("Addis Ababa");
  await checkout.getByLabel("Location / Address").fill("XRRH+5Q area");
  await checkout.getByRole("button", { name: "Place Order" }).click();
  await checkout.evaluate(() => document.getElementById("pommy-checkout-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await checkout.getByRole("heading", { name: "Order received" }).waitFor();
  assert((await checkout.locator("body").innerText()).includes("POM-2026-00001"), "Checkout did not display the trusted order number");
  assert(await checkout.locator("[data-cart-count]").first().innerText() === "0", "Successful persistence did not clear the cart");
  assert((await checkout.locator("body").innerText()).includes("The menu changed while your order was being prepared."), "Checkout did not explain the trusted price change");
  await checkout.getByRole("button", { name: "Copy Order Details" }).click();
  await checkout.getByText("Order details copied.").waitFor();
  await checkout.goto(base + "/product/beef-burger/", { waitUntil: "domcontentloaded" });
  await checkout.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await checkout.goto(base + "/checkout/", { waitUntil: "domcontentloaded" });
  await checkout.getByLabel("Full Name").fill("Pickup Customer");
  await checkout.getByLabel("Phone Number").fill("+251956905484");
  await checkout.getByLabel("Takeaway / Pickup", { exact: true }).check();
  assert(await checkout.locator("#pommy-delivery-fields").isHidden(), "Delivery fields remain visible for pickup");
  await checkout.getByRole("button", { name: "Place Order" }).click();
  await checkout.getByRole("heading", { name: "Order received" }).waitFor();
  assert(submittedOrders.length === 2, "Checkout did not submit exactly two persisted orders");
  assert(submittedOrders.every(payload => /^[0-9a-f-]{36}$/.test(payload.p_client_order_token)), "Checkout omitted a valid idempotency token");
  assert(submittedOrders.every(payload => payload.p_items.every(item => Object.keys(item).sort().join(",") === "quantity,slug")), "Checkout sent untrusted item fields to the RPC");
  await checkout.close();

  const failedCheckout = await context.newPage();
  await prepare(failedCheckout, { demoMode: false });
  await failedCheckout.goto(base + "/product/beef-burger/", { waitUntil: "domcontentloaded" });
  await failedCheckout.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await failedCheckout.goto(base + "/checkout/", { waitUntil: "domcontentloaded" });
  await failedCheckout.getByLabel("Full Name").fill("Retry Customer");
  await failedCheckout.getByLabel("Phone Number").fill("0956905484");
  await failedCheckout.getByLabel("Takeaway / Pickup", { exact: true }).check();
  await failedCheckout.getByRole("button", { name: "Place Order" }).click();
  await failedCheckout.getByText(/couldn't submit|temporarily unavailable/i).waitFor();
  assert(await failedCheckout.locator("[data-cart-count]").first().innerText() === "1", "Failed persistence cleared the cart");
  assert(await failedCheckout.getByRole("button", { name: "Place Order" }).isEnabled(), "Failed persistence left checkout locked");
  await failedCheckout.close();

  const retryCheckout = await context.newPage();
  await prepare(retryCheckout, { demoMode: false });
  const retryTokens = [];
  await retryCheckout.route("**/rest/v1/rpc/create_order", async route => {
    const payload = route.request().postDataJSON();
    retryTokens.push(payload.p_client_order_token);
    if (retryTokens.length === 1) return route.abort("failed");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000011",
        order_number: "POM-2026-00002",
        order_type: "takeaway",
        subtotal: 820,
        payment_method: "cash_on_delivery",
        status: "new",
        created_at: "2026-07-14T00:00:00Z",
        items: [{ menu_item_id: "00000000-0000-4000-8000-000000000001", product_name: "Beef Burger", unit_price: 820, quantity: 1, line_total: 820 }]
      })
    });
  });
  await retryCheckout.goto(base + "/checkout/", { waitUntil: "domcontentloaded" });
  await retryCheckout.getByLabel("Full Name").fill("Reload Customer");
  await retryCheckout.getByLabel("Phone Number").fill("0956905484");
  await retryCheckout.getByLabel("Takeaway / Pickup", { exact: true }).check();
  await retryCheckout.getByRole("button", { name: "Place Order" }).click();
  await retryCheckout.getByText(/couldn't submit/i).waitFor();
  await retryCheckout.reload({ waitUntil: "domcontentloaded" });
  await retryCheckout.getByLabel("Full Name").fill("Reload Customer");
  await retryCheckout.getByLabel("Phone Number").fill("0956905484");
  await retryCheckout.getByLabel("Takeaway / Pickup", { exact: true }).check();
  await retryCheckout.getByRole("button", { name: "Place Order" }).click();
  await retryCheckout.getByRole("heading", { name: "Order received" }).waitFor();
  assert(retryTokens.length === 2 && retryTokens[0] === retryTokens[1], "Reload retry did not preserve the idempotency token");
  await retryCheckout.close();

  const demoCheckout = await context.newPage();
  await prepare(demoCheckout);
  let demoOrderRequests = 0;
  demoCheckout.on("request", request => {
    if (request.url().includes("/rest/v1/rpc/create_order")) demoOrderRequests += 1;
  });
  await demoCheckout.goto(base + "/product/beef-burger/", { waitUntil: "domcontentloaded" });
  await demoCheckout.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await demoCheckout.goto(base + "/checkout/", { waitUntil: "domcontentloaded" });
  await demoCheckout.getByLabel("Full Name").fill("Demo Customer");
  await demoCheckout.getByLabel("Phone Number").fill("0956905484");
  await demoCheckout.getByLabel("Takeaway / Pickup", { exact: true }).check();
  await demoCheckout.getByRole("button", { name: "Place Order" }).click();
  await demoCheckout.getByText("This demonstration does not submit a real order. Your cart is still saved.").waitFor();
  assert(demoOrderRequests === 0, "Demo mode attempted a real order request");
  assert(await demoCheckout.locator("[data-cart-count]").first().innerText() === "1", "Demo mode cleared the cart");
  await demoCheckout.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  mobileContext.setDefaultTimeout(isRemote ? 60000 : 15000);
  mobileContext.setDefaultNavigationTimeout(60000);
  const mobile = await mobileContext.newPage();
  await prepare(mobile);
  await mobile.goto(base + "/", { waitUntil: "load" });
  await mobile.waitForFunction(() => Boolean(window.Webflow));
  assert(await mobile.evaluate(() => Boolean(window.Webflow)), "Local Webflow interaction runtime did not load");
  await mobile.locator(".lottie-animation svg").waitFor({ state: "attached", timeout: 10000 });
  await mobile.locator(".w-nav-button").click();
  await mobile.locator(".w-nav-menu").waitFor({ state: "visible", timeout: 5000 });
  assert(await mobile.locator(".w-nav-menu").isVisible(), "Mobile navigation did not open");
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Homepage has horizontal overflow on mobile");
  await mobile.close();
  await mobileContext.close();

  assert(failures.length === 0, `Failed local requests: ${failures.join(", ")}`);
  assert(pageErrors.length === 0, `Runtime exceptions: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({ routes: routes.length, menuProducts: 101, localRequestFailures: failures.length, runtimeErrors: pageErrors.length, consoleErrors: consoleErrors.length, status: "passed" }));
  await context.close();
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

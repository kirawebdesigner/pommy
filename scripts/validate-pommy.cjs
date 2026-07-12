const { chromium } = require("C:/Users/kirub/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const base = process.env.POMMY_BASE_URL || "http://127.0.0.1:8098";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  const consoleErrors = [];
  const pageErrors = [];

  async function prepare(page) {
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === base) route.continue();
      else route.abort();
    });
    page.on("console", message => {
      if (message.type() === "error" && !/ERR_FAILED/.test(message.text())) consoleErrors.push(message.text());
    });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => {
      const url = new URL(request.url());
      if (url.origin === base) failures.push(request.url());
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
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 });
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
  await prepare(checkout);
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
  await checkout.getByRole("heading", { name: "Order prepared" }).waitFor();
  assert(!(await checkout.locator("body").innerText()).includes("restaurant has received"), "Checkout falsely claims restaurant receipt");
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
  await checkout.getByRole("heading", { name: "Order prepared" }).waitFor();
  await checkout.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  await prepare(mobile);
  await mobile.goto(base + "/", { waitUntil: "load" });
  assert(await mobile.evaluate(() => Boolean(window.Webflow)), "Local Webflow interaction runtime did not load");
  await mobile.locator(".lottie-animation svg").waitFor({ state: "attached", timeout: 10000 });
  await mobile.locator(".w-nav-button").click();
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

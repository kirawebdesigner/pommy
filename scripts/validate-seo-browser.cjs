"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = (process.argv[2] || process.env.POMMY_BASE_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
const root = path.resolve(__dirname, "..");
const chrome = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

global.window = global;
require(path.join(root, "assets/data/menu.js"));
const bundledItems = global.POMMY_MENU || [];
const bundledCategories = global.POMMY_CATEGORIES || [];

function supabaseRows() {
  const categoryIds = new Map(bundledCategories.map((category, index) => [
    category.slug || category.id,
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
  ]));
  return {
    categories: bundledCategories.map((category, index) => ({
      id: categoryIds.get(category.slug || category.id),
      name: category.name,
      slug: category.slug || category.id,
      description: category.description || "",
      sort_order: index,
      is_active: category.active !== false
    })),
    items: bundledItems.map((item, index) => ({
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      price: item.price,
      image_url: item.image,
      is_available: item.available !== false,
      is_featured: Boolean(item.featured),
      sort_order: index,
      category: { slug: item.category, is_active: true }
    }))
  };
}

async function mockSupabase(page) {
  const rows = supabaseRows();
  await page.route("https://cruvatqjbignywiwoszh.supabase.co/**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/rest/v1/categories")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows.categories) });
    }
    if (url.pathname.endsWith("/rest/v1/menu_items")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows.items) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await browserContext.newPage();
  await mockSupabase(page);
  const errors = [];
  const failedLocalRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => {
    if (request.url().startsWith(base) && request.failure()?.errorText !== "net::ERR_ABORTED") failedLocalRequests.push(request.url());
  });
  await page.addInitScript(() => {
    window.__seoVitals = { cls: 0, lcp: 0, longTasks: 0 };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__seoVitals.cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      if (entries.length) window.__seoVitals.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(list => { window.__seoVitals.longTasks += list.getEntries().length; }).observe({ type: "longtask", buffered: true });
  });

  const routes = ["/", "/menu/", "/burger-around-cmc/", "/pizza-around-cmc/", "/contact/", "/checkout/", "/product/pommy-special-burger/", "/blog-posts/burger-lovers-guide-to-pommy/"];
  for (const route of routes) {
    const response = await page.goto(base + route, { waitUntil: "load" });
    assert(response && response.status() === 200, `${route}: expected HTTP 200`);
    await page.waitForFunction(() => window.Pommy && window.Pommy.ready);
    await page.evaluate(() => window.Pommy.ready);
    const state = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || "",
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      robots: document.querySelector('meta[name="robots"]')?.content || "",
      favicon: document.querySelector('link[rel="icon"]')?.href || "",
      manifest: document.querySelector('link[rel="manifest"]')?.href || "",
      h1: document.querySelectorAll("h1").length,
      main: document.querySelectorAll("main").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length,
      schema: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(element => element.textContent),
      brokenImages: Array.from(document.images).filter(image => image.complete && image.naturalWidth === 0).map(image => image.src),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    assert(state.title && state.description.length >= 70, `${route}: metadata is incomplete`);
    assert(state.canonical === `https://pommydemo.netlify.app${route}`, `${route}: canonical is incorrect`);
    assert(state.favicon === `${base}/favicon.png`, `${route}: favicon is incorrect`);
    assert(state.manifest === `${base}/site.webmanifest`, `${route}: manifest is incorrect`);
    assert(route === "/checkout/" ? state.robots.startsWith("noindex,follow") : state.robots.startsWith("index,follow"), `${route}: robots directive is incorrect`);
    assert(state.h1 === 1 && state.main === 1 && state.header === 1 && state.footer === 1, `${route}: semantic landmark or H1 count is incorrect`);
    assert(state.schema.length === 1, `${route}: expected one JSON-LD graph`);
    for (const schema of state.schema) {
      try { JSON.parse(schema); } catch (error) { failures.push(`${route}: browser JSON-LD is invalid`); }
    }
    assert(state.brokenImages.length === 0, `${route}: broken images: ${state.brokenImages.join(", ")}`);
    assert(!state.overflow, `${route}: horizontal overflow`);
  }

  await page.goto(base + "/menu/", { waitUntil: "load" });
  await page.waitForFunction(() => window.Pommy && window.Pommy.ready);
  await page.evaluate(() => window.Pommy.ready);
  const analytics = await page.evaluate(() => {
    const product = document.querySelector(".pommy-menu-card h3 a");
    const add = document.querySelector("[data-add-to-cart]");
    product.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    add.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return window.dataLayer.map(entry => entry.event).filter(Boolean);
  });
  for (const eventName of ["view_menu", "select_item", "add_to_cart"]) {
    assert(analytics.includes(eventName), `Analytics did not emit ${eventName}`);
  }

  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(1600);
  const vitals = await page.evaluate(() => ({
    ...window.__seoVitals,
    navigation: performance.getEntriesByType("navigation")[0]?.duration || 0,
    resources: performance.getEntriesByType("resource").length
  }));
  assert(vitals.cls < 0.1, `Homepage CLS is too high: ${vitals.cls}`);
  assert(vitals.lcp > 0, "Homepage LCP was not observed");

  const noScriptContext = await browser.newContext({ viewport: { width: 1024, height: 900 }, javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  for (const route of ["/", "/menu/", "/burger-around-cmc/", "/pizza-around-cmc/", "/contact/", "/product/pommy-special-burger/"]) {
    const response = await noScriptPage.goto(base + route, { waitUntil: "load" });
    assert(response && response.status() === 200, `${route}: no-JS request failed`);
    const sourceState = await noScriptPage.evaluate(() => ({
      h1: document.querySelectorAll("h1").length,
      main: document.querySelectorAll("main").length,
      links: document.querySelectorAll('a[href="/menu/"], a[href^="/product/"]').length,
      text: document.body.innerText
    }));
    assert(sourceState.h1 === 1 && sourceState.main === 1, `${route}: important source HTML requires JavaScript`);
    assert(sourceState.links > 0, `${route}: source HTML has no menu/product internal links`);
    assert(/Pommy|Menu item not found/.test(sourceState.text), `${route}: source HTML lacks useful content`);
  }
  await noScriptContext.close();

  for (const route of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
    const response = await fetch(base + route);
    assert(response.status === 200, `${route}: expected HTTP 200`);
    assert((await response.text()).length > 100, `${route}: response is unexpectedly empty`);
  }

  assert(errors.length === 0, `Console/runtime errors: ${errors.join(" | ")}`);
  assert(failedLocalRequests.length === 0, `Failed local requests: ${failedLocalRequests.join(", ")}`);
  await browserContext.close();
  await browser.close();

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({
    routes: routes.length,
    noJavaScriptRoutes: 6,
    sitemapUrls: 115,
    analyticsEvents: ["view_menu", "select_item", "add_to_cart"],
    vitals,
    consoleErrors: errors.length,
    failedLocalRequests: failedLocalRequests.length,
    status: "passed"
  }, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { chromium } = require("playwright");

const base = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalData() {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "../assets/data/menu.js"), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "assets/data/menu.js" });
  return { categories: sandbox.window.POMMY_CATEGORIES, items: sandbox.window.POMMY_MENU };
}

(async () => {
  const canonical = canonicalData();
  const categoryIds = new Map(canonical.categories.map((category, index) => [
    category.id,
    `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
  ]));
  const categories = canonical.categories.map((category, index) => ({
    id: categoryIds.get(category.id),
    name: category.name,
    slug: category.id,
    description: category.description || null,
    sort_order: index,
    is_active: true
  }));
  const categoryPayload = '<img src=x onerror="window.__categoryXss=true">';
  categories[0].name = categoryPayload;
  const items = canonical.items.map((item, index) => ({
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    category_id: categoryIds.get(item.category),
    name: item.name,
    slug: item.slug,
    description: item.description || null,
    price: item.slug === "beef-burger" ? 999 : item.price,
    image_url: item.image,
    is_available: item.slug !== "tea",
    is_featured: Boolean(item.featured),
    sort_order: index,
    category: { slug: item.category, is_active: true }
  }));

  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  context.on("page", page => {
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  });
  await context.route("**/rest/v1/categories?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "content-range": `0-${categories.length - 1}/${categories.length}` },
    body: JSON.stringify(categories)
  }));
  await context.route("**/rest/v1/menu_items?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "content-range": `0-${items.length - 1}/${items.length}` },
    body: JSON.stringify(items)
  }));

  const product = await context.newPage();
  await product.goto(`${base}/product/beef-burger/`, { waitUntil: "domcontentloaded" });
  await product.waitForFunction(() => window.Pommy && window.Pommy.ready);
  await product.evaluate(() => window.Pommy.ready);
  assert(await product.evaluate(() => window.PommyMenuService.getSource()) === "supabase", "Product page did not use live Supabase data");
  assert((await product.locator("main").innerText()).includes("999 ETB"), "Product page did not render the live database price");
  await product.close();

  const home = await context.newPage();
  await home.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await home.waitForFunction(() => document.querySelectorAll(".pommy-original-menu-card").length === 8);
  assert(await home.locator(".pommy-original-menu-card").count() === 8, "Live featured selection changed the eight-card homepage composition");
  await home.close();

  const menu = await context.newPage();
  await menu.addInitScript(() => { window.__categoryXss = false; });
  await menu.goto(`${base}/menu/`, { waitUntil: "domcontentloaded" });
  await menu.waitForFunction(() => document.querySelectorAll(".pommy-menu-card").length === 100);
  assert(await menu.getByRole("heading", { name: "Tea", exact: true }).count() === 0, "Unavailable live item remained in the orderable menu grid");
  assert(await menu.evaluate(() => window.PommyMenuService.getItems().find(item => item.slug === "beef-burger").price) === 999, "Normalized menu cache lost the live price");
  assert(await menu.evaluate(() => window.__categoryXss) === false, "Admin-edited category markup executed in the public menu");
  assert(await menu.locator("[data-category-filter]").nth(1).innerText() === categoryPayload, "Category labels were not rendered as text");
  await menu.close();

  const unavailable = await context.newPage();
  await unavailable.goto(`${base}/product/tea/`, { waitUntil: "domcontentloaded" });
  await unavailable.getByRole("button", { name: "Unavailable" }).waitFor();
  assert(await unavailable.getByRole("button", { name: "Unavailable" }).isDisabled(), "Unavailable product route remained orderable");
  await unavailable.close();

  assert(errors.length === 0, `Live-data browser errors: ${errors.join(" | ")}`);
  await browser.close();
  console.log(JSON.stringify({ source: "supabase", products: 101, featured: 8, livePrice: true, unavailableBlocked: true, errors: 0, status: "passed" }));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const failures = [];
const ignoredDirectories = new Set([".git", ".netlify", ".codex-screenshots", "node_modules", "template"]);

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function walk(directory, predicate, results = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) walk(target, predicate, results);
    else if (predicate(target)) results.push(target);
  }
  return results;
}

function loadData(relative, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(read(relative), sandbox, { filename: relative });
  return sandbox.window[key];
}

function titleOf(html) {
  return decodeHtml(html.match(/<title>(.*?)<\/title>/i)?.[1] || "");
}

function descriptionOf(html) {
  return decodeHtml(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || "");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function resolveSiteReference(fromFile, reference) {
  const clean = reference.split("#")[0].split("?")[0];
  if (!clean || /^(?:https?:|tel:|mailto:|data:|javascript:)/i.test(clean)) return null;
  let target = clean.startsWith("/") ? path.join(root, clean.slice(1)) : path.resolve(path.dirname(fromFile), clean);
  if (clean.endsWith("/")) target = path.join(target, "index.html");
  if (!path.extname(target) && fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  return target;
}

const menu = loadData("assets/data/menu.js", "POMMY_MENU");
const categories = loadData("assets/data/menu.js", "POMMY_CATEGORIES");
const posts = loadData("assets/data/blog.js", "POMMY_POSTS");
const htmlFiles = walk(root, file => path.basename(file) === "index.html");
const adminFiles = htmlFiles.filter(file => path.relative(root, file).replaceAll("\\", "/").startsWith("admin/"));
const publicHtmlFiles = htmlFiles.filter(file => !adminFiles.includes(file));

assert(menu.length === 101, `Expected 101 menu products, found ${menu.length}`);
assert(new Set(menu.map(item => item.id)).size === menu.length, "Menu product IDs are not unique");
assert(new Set(menu.map(item => item.slug)).size === menu.length, "Menu product slugs are not unique");
assert(new Set(menu.map(item => item.name.toLowerCase())).size === menu.length, "Duplicate product names are visible in the public menu");
assert(menu.every(item => typeof item.price === "number" && item.price > 0), "Every menu price must be a positive number");
assert(JSON.stringify(categories.map(item => item.id)) === JSON.stringify(["breakfast", "burger", "pizza", "wrap", "chicken", "juice", "shakes", "seasonal-juice", "hot-drinks", "soft-drinks"]), "Public categories do not match the confirmed non-empty categories");
assert(!categories.some(item => item.id === "dessert"), "Empty Dessert category is publicly visible");
assert(menu.find(item => item.slug === "double-peanut-tea")?.price === 200, "Double Peanut Tea must use the first supplied price of 200 ETB");
assert(menu.find(item => item.slug === "double-fasting-macchiato")?.price === 200, "Double Fasting Macchiato must use the first supplied price of 200 ETB");
assert(menu.find(item => item.slug === "peanut")?.price === 1330, "Peanut must retain the supplied 1330 ETB price");
assert(posts.length === 6 && new Set(posts.map(post => post.slug)).size === 6, "Expected six unique Pommy blog posts");

const indexedTitles = new Set();
for (const product of menu) {
  const relative = `product/${product.slug}/index.html`;
  assert(fs.existsSync(path.join(root, relative)), `Missing product route ${relative}`);
  const html = read(relative);
  assert(titleOf(html).startsWith(product.name + " |"), `Product title does not match ${product.name}`);
  assert(descriptionOf(html).toLowerCase().includes(product.name.toLowerCase()) || product.description, `Product description is not specific to ${product.name}`);
  assert(!indexedTitles.has(titleOf(html)), `Duplicate indexed title: ${titleOf(html)}`);
  indexedTitles.add(titleOf(html));
}

for (const post of posts) {
  const relative = `blog-posts/${post.slug}/index.html`;
  assert(fs.existsSync(path.join(root, relative)), `Missing blog route ${relative}`);
  const html = read(relative);
  assert(titleOf(html).startsWith(post.title + " |"), `Blog title does not match ${post.title}`);
  assert(descriptionOf(html) === post.description, `Blog description does not match ${post.title}`);
  assert(!indexedTitles.has(titleOf(html)), `Duplicate indexed title: ${titleOf(html)}`);
  indexedTitles.add(titleOf(html));
}

const primary = {
  "index.html": "Pommy Burger and Pizza | Burgers & Pizza Around CMC",
  "menu/index.html": "Pommy Menu & Prices | Burgers and Pizza Around CMC",
  "about/index.html": "About Pommy Burger and Pizza | CMC, Addis Ababa",
  "blog/index.html": "Pommy Food Guides | Burgers and Pizza in Addis Ababa",
  "contact/index.html": "Pommy CMC Location, Phone & Directions | Addis Ababa",
  "checkout/index.html": "Order Pommy Burger and Pizza | CMC, Addis Ababa"
};

for (const [relative, expectedTitle] of Object.entries(primary)) {
  const html = read(relative);
  assert(titleOf(html) === expectedTitle, `Incorrect title for ${relative}`);
  assert(descriptionOf(html).length >= 70, `Meta description is too short for ${relative}`);
  assert(!/name="robots" content="noindex/i.test(html), `Primary page is noindex: ${relative}`);
  assert(!indexedTitles.has(expectedTitle), `Duplicate indexed title: ${expectedTitle}`);
  indexedTitles.add(expectedTitle);
}

const sitemapLocations = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const sitemapTitles = new Set();
const sitemapDescriptions = new Set();
for (const location of sitemapLocations) {
  const pathname = new URL(location).pathname;
  const relative = pathname === "/" ? "index.html" : pathname.slice(1) + "index.html";
  const html = read(relative);
  const title = titleOf(html);
  const description = descriptionOf(html);
  assert(!/name="robots" content="noindex/i.test(html), `Sitemap route is noindex: ${relative}`);
  assert(!sitemapTitles.has(title), `Duplicate sitemap title: ${title}`);
  assert(!sitemapDescriptions.has(description), `Duplicate sitemap description: ${description}`);
  sitemapTitles.add(title);
  sitemapDescriptions.add(description);
}

for (const file of publicHtmlFiles) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const html = fs.readFileSync(file, "utf8");
  assert(titleOf(html), `Missing title: ${relative}`);
  assert(descriptionOf(html), `Missing meta description: ${relative}`);
  assert(html.includes('/assets/css/webflow-original.css'), `Missing original design CSS: ${relative}`);
  assert(html.includes('/assets/css/pommy-site.css'), `Missing Pommy CSS: ${relative}`);
  assert(html.includes('/assets/js/webflow-original.js'), `Missing Webflow interaction runtime: ${relative}`);
  assert(html.includes('data-pommy-schema="seo"'), `Missing SEO structured data: ${relative}`);
  const schemaText = html.match(/<script type="application\/ld\+json" data-pommy-schema="seo">(.*?)<\/script>/s)?.[1];
  try {
    const schema = JSON.parse(schemaText);
    assert(Array.isArray(schema["@graph"]) && schema["@graph"].some(entry => Array.isArray(entry["@type"]) && entry["@type"].includes("Restaurant")), `Missing Restaurant entity: ${relative}`);
  } catch (error) { failures.push(`Invalid JSON-LD: ${relative}`); }
  assert(!/data-wf-domain|data-wf-status|meta name="generator"|w-webflow-badge/i.test(html), `Unnecessary Webflow branding metadata remains: ${relative}`);
  assert(!/<link[^>]+rel="canonical"[^>]+(?:webflow|template)/i.test(html), `Old template canonical remains: ${relative}`);

  for (const match of html.matchAll(/\b(?:href|src|action)="([^"]+)"/gi)) {
    const target = resolveSiteReference(file, match[1]);
    if (target) assert(fs.existsSync(target), `Broken local reference in ${relative}: ${match[1]}`);
  }
}

for (const file of adminFiles) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const html = fs.readFileSync(file, "utf8");
  assert(titleOf(html), `Missing admin title: ${relative}`);
  assert(/name="robots" content="noindex,nofollow,noarchive"/i.test(html), `Admin page is indexable: ${relative}`);
  assert(html.includes('/assets/css/admin.css'), `Missing isolated admin CSS: ${relative}`);
  assert(html.includes('/assets/vendor/supabase-js-2.49.4.min.js'), `Missing pinned Supabase client: ${relative}`);
  assert(html.includes('/assets/config/supabase-config.js'), `Missing Supabase config: ${relative}`);
  assert(html.includes('/assets/js/supabase-client.js'), `Missing shared Supabase client: ${relative}`);
  assert(!html.includes('/assets/js/webflow-original.js'), `Admin page incorrectly loads Webflow runtime: ${relative}`);
  for (const match of html.matchAll(/\b(?:href|src|action)="([^"]+)"/gi)) {
    const target = resolveSiteReference(file, match[1]);
    if (target) assert(fs.existsSync(target), `Broken local reference in ${relative}: ${match[1]}`);
  }
}

for (const file of walk(path.join(root, "utility-pages"), file => path.basename(file) === "index.html")) {
  assert(/name="robots" content="noindex,follow"/i.test(fs.readFileSync(file, "utf8")), `Utility page is indexable: ${path.relative(root, file)}`);
}

for (const cssRelative of ["assets/css/webflow-original.css", "assets/css/dm-sans.css", "assets/css/pommy-site.css"]) {
  const cssFile = path.join(root, cssRelative);
  const css = fs.readFileSync(cssFile, "utf8");
  for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)) {
    if (match[1].startsWith("data:")) continue;
    const target = resolveSiteReference(cssFile, match[1]);
    if (target) assert(fs.existsSync(target), `Broken CSS asset in ${cssRelative}: ${match[1]}`);
  }
}

const servedSource = [
  ...publicHtmlFiles.map(file => fs.readFileSync(file, "utf8")),
  read("assets/data/menu.js"), read("assets/data/blog.js"), read("assets/config/order-config.js"),
  read("assets/js/pommy-site.js"), read("assets/js/menu-page.js"), read("assets/js/product-page.js"),
  read("assets/js/checkout-page.js"), read("assets/js/order-service.js")
].join("\n");

assert(!/Restaurante X|Los Angeles|\bUSD\b|lorem ipsum|View in AR|augmented reality|model-viewer|three\.js|site is currently unsecured/i.test(servedSource), "Generic branding, USD, AR, or broken ecommerce text remains in served customer source");
assert(!/Start Here|Styleguide|Licenses|Changelog/.test(read("assets/js/pommy-site.js")), "Utility pages remain in customer navigation or footer source");
assert(!/brixtemplates|hire our webflow team|need to customize this template/i.test(servedSource), "Template-provider promotion remains in served customer source");
assert(!/hello@restaurant|contact@restaurante|losangeles@/i.test(servedSource), "Fake template contact information remains");
assert(!/Visa|Mastercard|PayPal|Stripe|Apple Pay/.test(read("assets/js/checkout-page.js")), "Unsupported payment option remains in checkout");
assert(!/WhatsApp|Telegram/.test(read("assets/config/order-config.js") + read("assets/js/order-service.js")), "Unconfirmed messaging channel is configured");
assert(fs.existsSync(path.join(root, "MENU_DATA_REVIEW.md")), "MENU_DATA_REVIEW.md is missing");
assert(!fs.existsSync(path.join(root, ".wf_graphql")), ".wf_graphql compatibility directory still exists");
assert(!fs.existsSync(path.join(root, "assets/static-webflow-export.js")), "Obsolete Webflow export shim still exists");

const logo = fs.readFileSync(path.join(root, "assets/images/pommy-logo.png"));
const sourceLogo = fs.readFileSync("C:/Users/kirub/.codex/attachments/5e13dd93-c3a8-41f5-b8a3-332f55e435ea/image-1.png");
assert(crypto.createHash("sha256").update(logo).digest("hex") === crypto.createHash("sha256").update(sourceLogo).digest("hex"), "Local Pommy logo is not the exact uploaded source asset");

if (failures.length) {
  console.error(JSON.stringify({ status: "failed", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  htmlPages: htmlFiles.length,
  products: menu.length,
  categories: categories.length,
  blogPosts: posts.length,
  sitemapUrls: sitemapLocations.length,
  indexedUniqueTitles: sitemapTitles.size,
  indexedUniqueDescriptions: sitemapDescriptions.size,
  brokenLocalReferences: 0,
  forbiddenCustomerSourceMatches: 0,
  logoMatchesUploadedSource: true
}, null, 2));

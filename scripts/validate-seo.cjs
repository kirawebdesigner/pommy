"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];
const googleSiteVerification = "pY7z6H-NGHLqbbZ_31OKCE-mJV_FNFHOCZg6r6QEU3w";

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function routeFromFile(file) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  return relative === "index.html" ? "/" : "/" + relative.replace(/index\.html$/, "");
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(file);
  assert(buffer.toString("ascii", 1, 4) === "PNG", `${path.basename(file)}: expected a PNG file`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "template", ".codex-screenshots"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, output);
    else if (entry.name === "index.html") output.push(target);
  }
  return output;
}

const files = walk(root);
for (const file of files) {
  const route = routeFromFile(file);
  const source = fs.readFileSync(file, "utf8");
  const isAdmin = route.startsWith("/admin/");
  const title = source.match(/<title>([\s\S]*?)<\/title>/gi) || [];
  const descriptions = source.match(/<meta\s+name="description"/gi) || [];
  const canonicals = source.match(/<link\s+rel="canonical"/gi) || [];
  const verificationTags = source.match(/<meta\s+name="google-site-verification"/gi) || [];
  const faviconTags = source.match(/<link\s+rel="icon"[^>]*href="\/favicon\.png"[^>]*>/gi) || [];
  const manifestTags = source.match(/<link\s+rel="manifest"[^>]*href="\/site\.webmanifest"[^>]*>/gi) || [];
  const robotsMeta = (source.match(/<meta\s+name="robots"\s+content="([^"]+)"/i) || [])[1] || "";
  const h1s = source.match(/<h1(?:\s|>)/gi) || [];
  const schemas = [...source.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];

  assert(title.length === 1, `${route}: expected one title, found ${title.length}`);
  if (!isAdmin) {
    assert(descriptions.length === 1, `${route}: expected one description, found ${descriptions.length}`);
    assert(canonicals.length === 1, `${route}: expected one canonical, found ${canonicals.length}`);
    assert(verificationTags.length === 1, `${route}: expected one Google verification tag, found ${verificationTags.length}`);
    assert(faviconTags.length === 1, `${route}: expected one stable Pommy favicon link, found ${faviconTags.length}`);
    assert(manifestTags.length === 1, `${route}: expected one web manifest link, found ${manifestTags.length}`);
    assert(
      source.includes(`<meta name="google-site-verification" content="${googleSiteVerification}"/>`),
      `${route}: Google verification token is missing or incorrect`
    );
    assert(source.includes("<main"), `${route}: source HTML is missing <main>`);
    assert(source.includes("<header"), `${route}: source HTML is missing <header>`);
    assert(source.includes("<footer"), `${route}: source HTML is missing <footer>`);
    assert(h1s.length === 1, `${route}: expected one source H1, found ${h1s.length}`);
    assert(schemas.length === 1, `${route}: expected one JSON-LD graph, found ${schemas.length}`);
    for (const match of schemas) {
      try {
        const schema = JSON.parse(match[1]);
        if (route === "/") {
          const website = (schema["@graph"] || []).find((entry) => entry["@type"] === "WebSite");
          assert(website && website.name === "Pommy Burger and Pizza", "/: WebSite name is missing or incorrect");
          assert(website && Array.isArray(website.alternateName) && website.alternateName.includes("Pommy"), "/: WebSite alternateName is missing Pommy");
        }
      }
      catch (error) { failures.push(`${route}: invalid JSON-LD: ${error.message}`); }
    }
    if (route === "/menu/") assert(robotsMeta.startsWith("index,follow"), "/menu/: must remain indexable");
    if (route === "/checkout/") assert(robotsMeta.startsWith("noindex,follow"), "/checkout/: transactional page must be noindex,follow");
  }
}

for (const [file, expected] of [
  ["favicon.png", 96],
  ["favicon-48x48.png", 48],
  ["apple-touch-icon.png", 180],
  ["favicon-192x192.png", 192],
  ["favicon-512x512.png", 512]
]) {
  const dimensions = pngDimensions(path.join(root, file));
  assert(dimensions.width === expected && dimensions.height === expected, `${file}: expected ${expected}x${expected}, found ${dimensions.width}x${dimensions.height}`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "site.webmanifest"), "utf8"));
assert(manifest.name === "Pommy Burger and Pizza" && manifest.short_name === "Pommy", "site.webmanifest: Pommy identity is incorrect");

const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://pommydemo.netlify.app/sitemap.xml"), "robots.txt: missing absolute sitemap");
assert(robots.includes("Disallow: /admin/"), "robots.txt: admin route is not disallowed");
assert(!robots.includes("Disallow: /checkout/"), "robots.txt: checkout must remain crawlable so its noindex directive can be read");
for (const crawler of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "anthropic-ai", "Google-Extended", "Applebot-Extended", "cohere-ai"]) {
  if (crawler === "Googlebot" || crawler === "Bingbot") {
    assert(robots.includes("User-agent: *"), `robots.txt: ${crawler} is not covered by the public rule`);
  } else {
    const group = robots.match(new RegExp(`User-agent: ${crawler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n([\\s\\S]*?)(?:\\r?\\n\\r?\\n|$)`));
    assert(group, `robots.txt: missing ${crawler}`);
    assert(group && group[1].includes("Allow: /"), `robots.txt: ${crawler} is not allowed to crawl public routes`);
    assert(group && group[1].includes("Disallow: /admin/"), `robots.txt: ${crawler} can crawl the admin route`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(locations.length === new Set(locations).size, "sitemap.xml: duplicate URLs");
const sitemapTitles = new Set();
const sitemapDescriptions = new Set();
for (const location of locations) {
  const pathname = new URL(location).pathname;
  const file = pathname === "/" ? path.join(root, "index.html") : path.join(root, pathname.slice(1), "index.html");
  assert(fs.existsSync(file), `sitemap.xml: missing generated file for ${pathname}`);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const title = (source.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const description = (source.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || "";
  assert(!sitemapTitles.has(title), `sitemap.xml: duplicate indexed title "${title}"`);
  assert(!sitemapDescriptions.has(description), `sitemap.xml: duplicate indexed description on ${pathname}`);
  sitemapTitles.add(title);
  sitemapDescriptions.add(description);
}
for (const required of ["/", "/menu/", "/contact/", "/burger-around-cmc/", "/pizza-around-cmc/"]) {
  assert(locations.includes(`https://pommydemo.netlify.app${required}`), `sitemap.xml: missing ${required}`);
}
assert(!locations.includes("https://pommydemo.netlify.app/checkout/"), "sitemap.xml: contains transactional checkout route");
assert(!locations.some((url) => /\/(?:admin|401|404)\//.test(url)), "sitemap.xml: contains a private or error route");
assert(locations.length === 115, `sitemap.xml: expected 115 URLs, found ${locations.length}`);

const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
for (const fact of ["# Pommy Burger and Pizza", "Addis Ababa, Ethiopia", "+251 95 690 5484", "Services: Dine-in and takeaway"]) {
  assert(llms.includes(fact), `llms.txt: missing factual signal "${fact}"`);
}
assert(!/\/admin\/|\/checkout\//i.test(llms), "llms.txt: private or transactional route exposed");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`SEO validation passed for ${files.length} HTML pages and ${locations.length} sitemap URLs.`);

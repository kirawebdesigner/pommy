"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
global.window = global;
require(path.join(root, "assets/data/menu.js"));
require(path.join(root, "assets/data/blog.js"));
const config = require(path.join(root, "assets/config/seo-config.js"));

const menu = global.POMMY_MENU || [];
const categories = global.POMMY_CATEGORIES || [];
const posts = global.POMMY_POSTS || [];
const baseUrl = config.siteUrl;
const business = config.business;

function env(name, fallback = "") {
  return process.env[name] === undefined || process.env[name] === "" ? fallback : process.env[name];
}

function boolEnv(name, fallback) {
  const raw = env(name, String(fallback));
  return String(raw).toLowerCase() !== "false";
}

function html(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function absolute(routeOrPath) {
  if (/^https?:\/\//i.test(routeOrPath)) return routeOrPath;
  return baseUrl + (routeOrPath.startsWith("/") ? routeOrPath : "/" + routeOrPath);
}

function routeFromFile(file) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  if (relative === "index.html") return "/";
  return "/" + relative.replace(/index\.html$/, "");
}

function fileFromRoute(route) {
  return route === "/" ? path.join(root, "index.html") : path.join(root, route.replace(/^\/|\/$/g, ""), "index.html");
}

const routeMeta = new Map([
  ["/", {
    title: "Pommy Burger and Pizza | Burgers & Pizza Around CMC",
    description: "Explore Pommy Burger and Pizza around CMC in Addis Ababa. View current ETB menu prices, find directions, call Pommy or prepare an order.",
    image: business.defaultImagePath
  }],
  ["/menu/", {
    title: "Pommy Menu & Prices | Burgers and Pizza Around CMC",
    description: "Browse 101 Pommy menu items with current ETB prices for burgers, pizza, chicken, breakfast, wraps and drinks around CMC, Addis Ababa.",
    image: "/assets/images/menu/burger.jpg"
  }],
  ["/about/", {
    title: "About Pommy Burger and Pizza | CMC, Addis Ababa",
    description: "Learn about Pommy Burger and Pizza, a casual restaurant serving burgers, pizza, chicken, breakfast, wraps and drinks around CMC in Addis Ababa."
  }],
  ["/blog/", {
    title: "Pommy Food Guides | Burgers and Pizza in Addis Ababa",
    description: "Read practical Pommy guides about burgers, pizza, breakfast, menu choices and quick food options in Addis Ababa."
  }],
  ["/contact/", {
    title: "Pommy CMC Location, Phone & Directions | Addis Ababa",
    description: "Find Pommy Burger and Pizza around CMC in Addis Ababa. Use the confirmed plus code, call 095 690 5484 or browse the menu before visiting."
  }],
  ["/checkout/", {
    title: "Order Pommy Burger and Pizza | CMC, Addis Ababa",
    description: "Review your Pommy cart and prepare a cash-on-delivery or takeaway order for burgers, pizza and more around CMC in Addis Ababa."
  }],
  ["/delivery/", {
    title: "Pommy Delivery & Takeaway | CMC, Addis Ababa",
    description: "Learn how to prepare a Pommy delivery or takeaway order around CMC in Addis Ababa and call the restaurant to confirm details."
  }],
  ["/burger-around-cmc/", {
    title: "Burgers Around CMC | Pommy Burger and Pizza",
    description: "Explore Pommy burgers around CMC in Addis Ababa, compare current ETB prices, browse burger choices and prepare an order.",
    image: "/assets/images/menu/burger.jpg"
  }],
  ["/pizza-around-cmc/", {
    title: "Pizza Around CMC | Pommy Burger and Pizza",
    description: "Explore Pommy pizza around CMC in Addis Ababa, compare current ETB prices, browse pizza choices and prepare an order.",
    image: "/assets/images/menu/hot-drink.jpg"
  }],
  ["/404/", { title: "Page Not Found | Pommy Burger and Pizza", description: "Return to the Pommy homepage or browse the current menu.", noindex: true }],
  ["/401/", { title: "Page Unavailable | Pommy Burger and Pizza", description: "Return to the Pommy homepage or browse the current menu.", noindex: true }]
]);

for (const item of menu) {
  routeMeta.set(`/product/${item.slug}/`, {
    title: `${item.name} | Pommy Menu Around CMC`,
    description: `View ${item.name} at Pommy Burger and Pizza around CMC, Addis Ababa. See its current ETB price, description and related menu choices.`,
    image: item.image,
    product: item
  });
}

for (const post of posts) {
  routeMeta.set(`/blog-posts/${post.slug}/`, {
    title: `${post.title} | Pommy Blog`,
    description: post.description,
    image: post.image,
    post
  });
}

function breadcrumb(route, label) {
  const parts = [{ "@type": "ListItem", position: 1, name: "Home", item: absolute("/") }];
  if (route.startsWith("/product/")) parts.push({ "@type": "ListItem", position: 2, name: "Menu", item: absolute("/menu/") });
  if (route.startsWith("/blog-posts/")) parts.push({ "@type": "ListItem", position: 2, name: "Blog", item: absolute("/blog/") });
  parts.push({ "@type": "ListItem", position: parts.length + 1, name: label, item: absolute(route) });
  return { "@type": "BreadcrumbList", "@id": absolute(route) + "#breadcrumb", itemListElement: parts };
}

function globalGraph() {
  const address = {
    "@type": "PostalAddress",
    addressLocality: business.address.locality,
    addressRegion: business.address.region,
    addressCountry: business.address.countryCode
  };
  if (business.address.postalCode) address.postalCode = business.address.postalCode;

  const restaurant = {
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": baseUrl + "/#restaurant",
    name: business.name,
    description: business.description,
    url: baseUrl + "/",
    telephone: business.phoneInternational,
    image: [absolute(business.defaultImagePath)],
    logo: absolute(business.logoPath),
    address,
    hasMap: business.directionsUrl,
    hasMenu: absolute(business.menuPath),
    servesCuisine: business.cuisines,
    areaServed: business.areaServed.map((name) => ({ "@type": "Place", name })),
    currenciesAccepted: business.currenciesAccepted,
    paymentAccepted: business.paymentAccepted
  };
  if (business.openingHours) restaurant.openingHoursSpecification = business.openingHours;
  if (business.coordinates) restaurant.geo = Object.assign({ "@type": "GeoCoordinates" }, business.coordinates);
  if (business.socialProfiles.length) restaurant.sameAs = business.socialProfiles;

  return [
    {
      "@type": "WebSite",
      "@id": baseUrl + "/#website",
      url: baseUrl + "/",
      name: business.name,
      description: business.description,
      inLanguage: "en",
      publisher: { "@id": baseUrl + "/#organization" }
    },
    {
      "@type": "Organization",
      "@id": baseUrl + "/#organization",
      name: business.name,
      url: baseUrl + "/",
      logo: { "@type": "ImageObject", url: absolute(business.logoPath) },
      telephone: business.phoneInternational
    },
    restaurant
  ];
}

function schemaFor(route, meta) {
  const graph = globalGraph();
  graph.push({
    "@type": route === "/blog/" ? "Blog" : route.includes("around-cmc") ? "CollectionPage" : "WebPage",
    "@id": absolute(route) + "#webpage",
    url: absolute(route),
    name: meta.title,
    description: meta.description,
    isPartOf: { "@id": baseUrl + "/#website" },
    about: { "@id": baseUrl + "/#restaurant" },
    inLanguage: "en"
  });

  if (route !== "/") graph.push(breadcrumb(route, meta.product ? meta.product.name : meta.post ? meta.post.title : meta.title.split("|")[0].trim()));

  if (route === "/menu/") {
    graph.push({
      "@type": "Menu",
      "@id": absolute("/menu/") + "#menu",
      name: "Pommy Burger and Pizza Menu",
      url: absolute("/menu/"),
      hasMenuSection: categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name,
        hasMenuItem: menu.filter((item) => item.category === (category.slug || category.id)).map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          description: item.description || undefined,
          url: absolute(`/product/${item.slug}/`),
          image: absolute(item.image),
          offers: {
            "@type": "Offer",
            price: Number(item.price).toFixed(2),
            priceCurrency: "ETB",
            availability: item.available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: absolute(`/product/${item.slug}/`)
          }
        }))
      }))
    });
  }

  if (meta.product) {
    graph.push({
      "@type": "Product",
      "@id": absolute(route) + "#product",
      name: meta.product.name,
      description: meta.product.description || `A menu item from ${business.name}.`,
      image: [absolute(meta.product.image)],
      category: meta.product.category,
      brand: { "@type": "Brand", name: business.name },
      offers: {
        "@type": "Offer",
        url: absolute(route),
        price: Number(meta.product.price).toFixed(2),
        priceCurrency: "ETB",
        availability: meta.product.available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        seller: { "@id": baseUrl + "/#organization" }
      }
    });
  }

  if (meta.post) {
    graph.push({
      "@type": "BlogPosting",
      "@id": absolute(route) + "#article",
      headline: meta.post.title,
      description: meta.post.description,
      image: [absolute(meta.post.image)],
      datePublished: meta.post.date,
      dateModified: meta.post.date,
      author: { "@id": baseUrl + "/#organization" },
      publisher: { "@id": baseUrl + "/#organization" },
      mainEntityOfPage: { "@id": absolute(route) + "#webpage"
      }
    });
  }

  if (route === "/contact/") {
    graph.push({
      "@type": "FAQPage",
      "@id": absolute(route) + "#faq",
      mainEntity: [
        ["Can I dine in?", "Yes. Dine-in and table service are listed as available."],
        ["Can I order takeaway?", "Yes. Takeaway is listed as an available service option."],
        ["How do I confirm an order?", "Prepare the order on this website, then call Pommy using the restaurant phone number."],
        ["Where is Pommy?", "Pommy is in Addis Ababa. Use the confirmed plus code XRRH+5Q Addis Ababa for directions."]
      ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }))
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function inferMeta(route, source) {
  if (routeMeta.has(route)) return routeMeta.get(route);
  const title = (source.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || business.name;
  const description = (source.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || business.description;
  return { title: title.replace(/&amp;/g, "&"), description, noindex: true };
}

function cleanHead(source) {
  return source
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|theme-color|google-site-verification|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
    .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/^[ \t]+$/gm, "");
}

function metadataMarkup(route, meta) {
  const canonical = absolute(route);
  const image = absolute(meta.image || business.defaultImagePath);
  const lines = [
    `  <title>${html(meta.title)}</title>`,
    `  <meta name="description" content="${html(meta.description)}"/>`,
    `  <link rel="canonical" href="${html(canonical)}"/>`,
    `  <meta name="robots" content="${meta.noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}"/>`,
    `  <meta name="theme-color" content="#ff7629"/>`,
    `  <meta property="og:type" content="${meta.post ? "article" : "website"}"/>`,
    `  <meta property="og:site_name" content="${html(business.name)}"/>`,
    `  <meta property="og:title" content="${html(meta.title)}"/>`,
    `  <meta property="og:description" content="${html(meta.description)}"/>`,
    `  <meta property="og:url" content="${html(canonical)}"/>`,
    `  <meta property="og:image" content="${html(image)}"/>`,
    `  <meta property="og:image:alt" content="${html(meta.product ? meta.product.name : business.name)}"/>`,
    `  <meta name="twitter:card" content="summary_large_image"/>`,
    `  <meta name="twitter:title" content="${html(meta.title)}"/>`,
    `  <meta name="twitter:description" content="${html(meta.description)}"/>`,
    `  <meta name="twitter:image" content="${html(image)}"/>`
  ];
  if (config.googleSiteVerification) {
    lines.push(`  <meta name="google-site-verification" content="${html(config.googleSiteVerification)}"/>`);
  }
  const json = JSON.stringify(schemaFor(route, meta)).replace(/</g, "\\u003c");
  lines.push(`  <script type="application/ld+json" data-pommy-schema="seo">${json}</script>`);
  return lines.join("\n");
}

function ensureScripts(source) {
  const marker = '  <script src="/assets/data/menu.js"></script>';
  if (!source.includes("/assets/config/public-runtime-config.js")) {
    source = source.replace(marker, marker + '\n  <script src="/assets/config/public-runtime-config.js"></script>\n  <script src="/assets/config/seo-config.js"></script>');
  }
  if (!source.includes("/assets/js/analytics.js")) {
    source = source.replace('  <script src="/assets/js/order-service.js"></script>', '  <script src="/assets/js/order-service.js"></script>\n  <script src="/assets/js/analytics.js"></script>');
  }
  return source;
}

function writeRuntimeConfig() {
  const runtime = {
    PUBLIC_SITE_URL: baseUrl,
    PUBLIC_DEMO_MODE: boolEnv("PUBLIC_DEMO_MODE", true),
    PUBLIC_GA4_ID: env("PUBLIC_GA4_ID"),
    PUBLIC_GTM_ID: env("PUBLIC_GTM_ID"),
    PUBLIC_GOOGLE_SITE_VERIFICATION: config.googleSiteVerification
  };
  const output = `(function () {\n  "use strict";\n\n  window.POMMY_PUBLIC_ENV = Object.freeze(${JSON.stringify(runtime, null, 2)});\n})();\n`;
  fs.writeFileSync(path.join(root, "assets/config/public-runtime-config.js"), output);
}

writeRuntimeConfig();

const htmlFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "template" || entry.name === ".codex-screenshots") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name === "index.html" && !target.includes(`${path.sep}admin${path.sep}`)) htmlFiles.push(target);
  }
}
walk(root);

const metadataInventory = [];
for (const file of htmlFiles) {
  const route = routeFromFile(file);
  let source = fs.readFileSync(file, "utf8");
  const meta = inferMeta(route, source);
  const schemaTypes = schemaFor(route, meta)["@graph"]
    .flatMap((entry) => Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]])
    .filter(Boolean);
  metadataInventory.push({
    route,
    title: meta.title,
    description: meta.description,
    canonical: absolute(route),
    indexable: !meta.noindex,
    schemaTypes: [...new Set(schemaTypes)].join(", ")
  });
  source = ensureScripts(cleanHead(source));
  source = source.replace("</head>", metadataMarkup(route, meta) + "\n</head>");
  fs.writeFileSync(file, source);
}

const indexableRoutes = [...routeMeta.entries()]
  .filter(([, meta]) => !meta.noindex)
  .map(([route]) => route)
  .sort((left, right) => left === "/" ? -1 : right === "/" ? 1 : left.localeCompare(right));

const namedCrawlers = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai"
];
const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin/",
  "Disallow: /checkout/",
  "",
  ...namedCrawlers.flatMap((crawler) => [
    `User-agent: ${crawler}`,
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /checkout/",
    ""
  ]),
  `Sitemap: ${absolute("/sitemap.xml")}`,
  ""
].join("\n");
fs.writeFileSync(path.join(root, "robots.txt"), robots);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexableRoutes.map((route) => {
    const post = routeMeta.get(route).post;
    return `  <url><loc>${html(absolute(route))}</loc>${post ? `<lastmod>${post.date}</lastmod>` : ""}</url>`;
  }),
  "</urlset>",
  ""
].join("\n");
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

const llms = [
  `# ${business.name}`,
  "",
  `Official website for ${business.name} in Addis Ababa, Ethiopia.`,
  "",
  "## Important pages",
  "",
  `- [Home](${absolute("/")})`,
  `- [Menu](${absolute("/menu/")})`,
  `- [About](${absolute("/about/")})`,
  `- [Contact](${absolute("/contact/")})`,
  `- [Blog](${absolute("/blog/")})`,
  "",
  "## Business information",
  "",
  `- ${business.address.locality}, Ethiopia`,
  `- Plus code: ${business.address.plusCode}`,
  `- Phone: ${business.phoneInternational.replace("+251", "+251 ").replace(/(\d{2})(\d{3})(\d{4})$/, "$1 $2 $3")}`,
  "- Services: Dine-in and takeaway",
  ""
].join("\n");
fs.writeFileSync(path.join(root, "llms.txt"), llms);

const metadataReport = [
  "# SEO Metadata Inventory",
  "",
  "Generated by `scripts/generate-seo.cjs`. Do not edit route rows by hand.",
  "",
  `Canonical site URL: ${baseUrl}`,
  `Generated public HTML pages: ${metadataInventory.length}`,
  `Indexable sitemap routes: ${indexableRoutes.length}`,
  "",
  "| Route | Index | Title | Meta description | Canonical | Schema types |",
  "|---|---|---|---|---|---|",
  ...metadataInventory
    .sort((left, right) => left.route === "/" ? -1 : right.route === "/" ? 1 : left.route.localeCompare(right.route))
    .map((entry) => `| ${markdown(entry.route)} | ${entry.indexable ? "index" : "noindex"} | ${markdown(entry.title)} | ${markdown(entry.description)} | ${markdown(entry.canonical)} | ${markdown(entry.schemaTypes)} |`),
  ""
].join("\n");
fs.writeFileSync(path.join(root, "SEO_METADATA.md"), metadataReport);

console.log(`SEO metadata updated for ${htmlFiles.length} HTML files; sitemap contains ${indexableRoutes.length} canonical URLs.`);

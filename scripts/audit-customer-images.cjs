const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const baseUrl = (process.env.POMMY_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const chromeExecutable = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outputFile = path.resolve(root, process.env.POMMY_IMAGE_AUDIT_FILE || ".codex-screenshots/customer-image-audit.json");
const excludedRoots = new Set([".codex-screenshots", ".git", ".agents", "assets", "scripts", "template"]);

function findRoutes(directory = root) {
  const routes = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && directory === root && excludedRoots.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) routes.push(...findRoutes(absolute));
    if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      routes.push(relative === "index.html" ? "/" : `/${relative.slice(0, -"index.html".length)}`);
    }
  }
  return routes.sort();
}

function localUrl(value) {
  try {
    const url = new URL(value, baseUrl);
    return url.origin === new URL(baseUrl).origin ? url.href : null;
  } catch {
    return null;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const routes = findRoutes();
  const assetUrls = new Set();
  const brokenDomImages = [];
  const failedRequests = [];
  const badResponses = [];

  page.on("requestfailed", request => {
    const url = localUrl(request.url());
    if (url && request.resourceType() === "image") {
      failedRequests.push({ url, error: request.failure()?.errorText || "request failed" });
    }
  });
  page.on("response", response => {
    const url = localUrl(response.url());
    if (url && response.request().resourceType() === "image" && response.status() >= 400) {
      badResponses.push({ url, status: response.status() });
    }
  });

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelectorAll("img").forEach(image => { image.loading = "eager"; }));
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete), null, { timeout: 10000 }).catch(() => {});
    const report = await page.evaluate(() => {
      const urls = new Set();
      const broken = [];
      const add = value => {
        if (!value || value.startsWith("data:") || value.startsWith("blob:")) return;
        try { urls.add(new URL(value, document.baseURI).href); } catch {}
      };
      const addSrcset = value => {
        (value || "").split(",").forEach(part => add(part.trim().split(/\s+/)[0]));
      };

      document.querySelectorAll("img").forEach((img, index) => {
        add(img.currentSrc || img.src);
        add(img.getAttribute("src"));
        addSrcset(img.getAttribute("srcset"));
        if (!img.complete || img.naturalWidth <= 0) {
          broken.push({
            index,
            src: img.getAttribute("src") || "",
            currentSrc: img.currentSrc || "",
            alt: img.alt || ""
          });
        }
      });
      document.querySelectorAll("source").forEach(source => {
        add(source.getAttribute("src"));
        addSrcset(source.getAttribute("srcset"));
      });
      document.querySelectorAll("*").forEach(element => {
        const background = getComputedStyle(element).backgroundImage;
        for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) add(match[1]);
      });
      return { urls: [...urls], broken };
    });

    report.urls.map(localUrl).filter(Boolean).forEach(url => assetUrls.add(url));
    report.broken.forEach(image => brokenDomImages.push({ route, ...image }));
  }

  const httpFailures = [];
  for (const url of [...assetUrls].sort()) {
    const response = await page.request.get(url, { failOnStatusCode: false });
    if (response.status() >= 400) httpFailures.push({ url, status: response.status() });
  }

  await browser.close();
  const unique = items => [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
  const result = {
    baseUrl,
    routesChecked: routes.length,
    localImageUrlsChecked: assetUrls.size,
    brokenDomImages: unique(brokenDomImages),
    failedImageRequests: unique(failedRequests),
    badImageResponses: unique(badResponses),
    failedLocalImageFetches: unique(httpFailures)
  };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    outputFile,
    baseUrl,
    routesChecked: result.routesChecked,
    localImageUrlsChecked: result.localImageUrlsChecked,
    brokenDomImages: result.brokenDomImages.length,
    failedImageRequests: result.failedImageRequests.length,
    badImageResponses: result.badImageResponses.length,
    failedLocalImageFetches: result.failedLocalImageFetches.length
  }, null, 2));
  if (result.brokenDomImages.length || result.failedImageRequests.length || result.badImageResponses.length || result.failedLocalImageFetches.length) {
    process.exitCode = 1;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

const { chromium } = require("playwright");
const fs = require("fs");

const base = process.env.POMMY_BASE_URL || "http://127.0.0.1:8098";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const output = ".codex-screenshots/pommy-after";
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const errors = [];
  const failures = [];
  const badResponses = [];
  const results = [];
  const targets = [
    ["home", "/", 1440, 1000],
    ["menu", "/menu/", 1440, 1000],
    ["about", "/about/", 1440, 1000],
    ["contact", "/contact/", 1440, 1000],
    ["product", "/product/pommy-special-burger/", 1440, 1000],
    ["checkout", "/checkout/", 1440, 1000],
    ["home-mobile", "/", 390, 844],
    ["menu-mobile", "/menu/", 390, 844],
    ["checkout-mobile", "/checkout/", 390, 844]
  ];

  for (const [name, route, width, height] of targets) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${route}: ${error.message}`));
    page.on("console", message => { if (message.type() === "error") errors.push(`${route}: ${message.text()}`); });
    page.on("requestfailed", request => failures.push(`${route}: ${request.url()} (${request.failure()?.errorText || "failed"})`));
    page.on("response", response => { if (response.status() >= 400) badResponses.push(`${route}: ${response.status()} ${response.url()}`); });
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator("#main-content").waitFor({ state: "attached", timeout: 30000 });
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < pageHeight; y += Math.max(400, Math.floor(height * 0.8))) {
      await page.evaluate(value => window.scrollTo(0, value), y);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForFunction(() => Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect();
        return image.offsetParent !== null && rect.bottom >= -window.innerHeight && rect.top <= window.innerHeight * 2;
      }).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15000 }).catch(() => {});
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const h1 = document.querySelector("h1");
      const button = document.querySelector(".button-primary");
      const header = document.querySelector(".header");
      const visibleImages = Array.from(document.images).filter(image => image.offsetParent !== null);
      return {
        title: document.title,
        h1: h1?.textContent.trim(),
        fontFamily: body.fontFamily,
        h1FontFamily: h1 ? getComputedStyle(h1).fontFamily : null,
        primaryButtonBackground: button ? getComputedStyle(button).backgroundColor : null,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        visibleImages: visibleImages.length,
        brokenVisibleImages: visibleImages.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
        webflowLoaded: Boolean(window.Webflow)
      };
    });
    let mobileMenuOpens = null;
    if (width <= 390) {
      const menuButton = page.locator(".w-nav-button");
      if (await menuButton.isVisible()) {
        await menuButton.click();
        mobileMenuOpens = await page.locator(".w-nav-menu").waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
        if (mobileMenuOpens) await menuButton.click();
      }
    }
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    results.push({ name, route, status: response?.status(), mobileMenuOpens, ...metrics });
    await context.close();
  }

  console.log(JSON.stringify({ results, errors, failures, badResponses }, null, 2));
  await browser.close();
  if (errors.length || badResponses.some(line => line.includes(base)) || results.some(result => result.status !== 200 || result.brokenVisibleImages.length || result.scrollWidth > result.clientWidth || result.mobileMenuOpens === false)) process.exit(1);
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

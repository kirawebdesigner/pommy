const { chromium } = require("playwright");
const fs = require("fs");

const base = process.env.POMMY_BASE_URL || "http://127.0.0.1:8098";
const captureRoute = process.env.POMMY_CAPTURE_ROUTE || "/";
const output = process.env.POMMY_SCREENSHOT_DIR || ".codex-screenshots/polish-after";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const requestedWidth = Number(process.env.POMMY_CAPTURE_WIDTH || 0);
const viewports = [
  ["1440", 1440, 1000],
  ["1024", 1024, 900],
  ["768", 768, 900],
  ["390", 390, 844]
].filter(([, width]) => !requestedWidth || width === requestedWidth);

fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const results = [];
  const errors = [];

  for (const [name, width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route("**/rest/v1/categories?**", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await context.route("**/rest/v1/menu_items?**", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    page.on("console", message => { if (message.type() === "error") errors.push(`${name}: ${message.text()}`); });
    const response = await page.goto(`${base}${captureRoute}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator("#main-content, .page-wrapper").first().waitFor({ state: "attached" });
    if (captureRoute === "/") {
      await page.waitForFunction(() => {
        try { return Boolean(window.Webflow?.require("ix2")?.store?.getState().ixSession.active); }
        catch (error) { return false; }
      }, null, { timeout: 10000 });
    }
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < pageHeight; y += Math.floor(height * 0.72)) {
      await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
      await page.waitForFunction(() => Array.from(document.querySelectorAll("[data-w-id]")).filter(element => {
        const rect = element.getBoundingClientRect();
        return element.offsetParent !== null && rect.bottom > 0 && rect.top < window.innerHeight;
      }).every(element => Number.parseFloat(getComputedStyle(element).opacity || "1") >= .85), null, { timeout: 3500 }).catch(() => {});
    }
    const revealTargets = page.locator(".pommy-original-home [data-w-id]");
    for (let index = 0; index < await revealTargets.count(); index += 1) {
      const target = revealTargets.nth(index);
      if (await target.evaluate(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85)) {
        await target.evaluate(element => element.scrollIntoView({ block: "center", inline: "nearest" }));
        await target.evaluate(element => new Promise(resolve => {
          const deadline = performance.now() + 2400;
          function sample() {
            if (Number.parseFloat(getComputedStyle(element).opacity || "1") >= .85 || performance.now() >= deadline) resolve();
            else requestAnimationFrame(sample);
          }
          sample();
        }));
      }
    }
    await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 20000 }).catch(() => {});
    await page.screenshot({ path: `${output}/home-${name}.png`, fullPage: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => Array.from(document.querySelectorAll(".section.home-hero [data-w-id]")).every(element => Number.parseFloat(getComputedStyle(element).opacity || "1") >= .85), null, { timeout: 5000 }).catch(() => {});

    const metrics = await page.evaluate(() => ({
      pageHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hero: (() => {
        const select = selector => document.querySelector(selector);
        const rect = element => {
          const value = element?.getBoundingClientRect();
          return value ? {
            x: Math.round(value.x),
            y: Math.round(value.y),
            width: Math.round(value.width),
            height: Math.round(value.height),
            centerY: Math.round(value.y + value.height / 2)
          } : null;
        };
        const heading = select(".pommy-home-hero-copy h1");
        const lineHeight = heading ? Number.parseFloat(getComputedStyle(heading).lineHeight) : 0;
        const headingRect = rect(heading);
        return {
          section: rect(select(".section.home-hero")),
          container: rect(select(".pommy-home-hero-container")),
          grid: rect(select(".pommy-home-hero-grid")),
          copy: rect(select(".pommy-home-hero-copy")),
          heading: headingRect,
          headingLines: headingRect && lineHeight ? Math.round(headingRect.height / lineHeight) : null,
          paragraph: rect(select(".pommy-home-hero-copy > p")),
          buttons: rect(select(".pommy-home-hero-copy ._2-button-wrap")),
          media: rect(select(".pommy-home-hero-media")),
          image: rect(select(".image.home-hero-image"))
        };
      })(),
      hiddenTargets: Array.from(document.querySelectorAll(".pommy-original-home [data-w-id]")).filter(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85).map(element => ({ id: element.dataset.wId, className: element.className, opacity: getComputedStyle(element).opacity, inlineStyle: element.getAttribute("style") })),
      footer: (() => {
        const footer = document.querySelector("footer.footer");
        const grid = footer?.querySelector(".footer-grid");
        if (!footer || !grid) return null;
        const footerRect = footer.getBoundingClientRect();
        const gridRect = grid.getBoundingClientRect();
        const style = getComputedStyle(grid);
        return {
          height: Math.round(footerRect.height),
          gridHeight: Math.round(gridRect.height),
          display: style.display,
          opacity: style.opacity,
          transform: style.transform,
          visibility: style.visibility,
          textLength: grid.innerText.trim().length,
          columns: Array.from(grid.children).map(column => {
            const columnStyle = getComputedStyle(column);
            const columnRect = column.getBoundingClientRect();
            return {
              height: Math.round(columnRect.height),
              opacity: columnStyle.opacity,
              visibility: columnStyle.visibility,
              color: columnStyle.color,
              transform: columnStyle.transform
            };
          })
        };
      })(),
      sections: Array.from(document.querySelectorAll("#main-content > section")).map((section, index) => {
        const inner = section.querySelector(":scope > .pommy-section-inner");
        const rect = section.getBoundingClientRect();
        const style = inner ? getComputedStyle(inner) : null;
        return {
          index: index + 1,
          className: section.className,
          height: Math.round(rect.height),
          paddingTop: style ? style.paddingTop : null,
          paddingBottom: style ? style.paddingBottom : null
        };
      })
    }));

    await page.screenshot({ path: `${output}/hero-${name}.png`, fullPage: false });
    results.push({ viewport: `${width}x${height}`, status: response?.status(), ...metrics });
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify({ output, results, errors }, null, 2));
  if (errors.length || results.some(result => result.status !== 200 || result.scrollWidth > result.clientWidth || result.hiddenTargets.length)) process.exit(1);
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

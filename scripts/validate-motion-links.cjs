const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = (process.env.POMMY_BASE_URL || "http://127.0.0.1:8106").replace(/\/$/, "");
const output = path.resolve(process.env.POMMY_VISUAL_DIR || ".codex-screenshots/motion-link-validation");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const requestedWidths = new Set((process.env.POMMY_MOTION_WIDTHS || "").split(",").map(Number).filter(Boolean));
const viewports = [
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 }
].filter(viewport => !requestedWidths.size || requestedWidths.has(viewport.width));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function linkState(page, selector) {
  return page.locator(selector).first().evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      decoration: style.textDecorationLine,
      color: style.color,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      rect: [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100)
    };
  });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const results = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForFunction(() => {
      try { return Boolean(window.Webflow?.require("ix2")?.store?.getState().ixSession.active); }
      catch { return false; }
    });
    await page.waitForTimeout(1400);

    await page.evaluate(async duration => {
      const endY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      await new Promise(resolve => {
        const started = performance.now();
        function frame(now) {
          const progress = Math.min(1, (now - started) / duration);
          const eased = .5 - Math.cos(Math.PI * progress) / 2;
          scrollTo(0, endY * eased);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }, viewport.width === 390 ? 9000 : 7000);
    await page.waitForTimeout(1400);
    const motion = await page.evaluate(() => ({
      fallback: window.__pommyMotionMetrics?.fallbackActivations || [],
      hidden: Array.from(document.querySelectorAll(".pommy-original-home [data-w-id]")).filter(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85).length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    assert(motion.hidden === 0, `${viewport.width}: ${motion.hidden} IX2 targets remained hidden`);
    assert(!motion.overflow, `${viewport.width}: horizontal overflow detected`);
    await page.screenshot({ path: path.join(output, `${viewport.width}.png`), fullPage: true });

    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForTimeout(1400);

    const homeTitleSelector = ".pommy-original-menu-card .title a";
    const homeAddSelector = ".pommy-original-add";
    const title = page.locator(homeTitleSelector).first();
    await title.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    const titleDefault = await linkState(page, homeTitleSelector);
    const addDefault = await linkState(page, homeAddSelector);
    assert(titleDefault.decoration === "none", `${viewport.width}: homepage product title is underlined`);
    assert(addDefault.decoration === "none", `${viewport.width}: homepage add action is underlined`);

    await title.hover();
    await page.waitForTimeout(220);
    const titleHover = await linkState(page, homeTitleSelector);
    assert(titleHover.color !== titleDefault.color, `${viewport.width}: homepage title hover has no response`);
    assert(Math.abs(titleHover.rect[2] - titleDefault.rect[2]) < .1 && Math.abs(titleHover.rect[3] - titleDefault.rect[3]) < .1, `${viewport.width}: title hover shifted layout (${titleDefault.rect.join(",")} -> ${titleHover.rect.join(",")})`);
    await title.focus();
    const titleFocus = await linkState(page, homeTitleSelector);
    assert(titleFocus.outlineStyle === "solid" && Number.parseFloat(titleFocus.outlineWidth) >= 3, `${viewport.width}: title focus is not clearly visible`);

    const add = page.locator(homeAddSelector).first();
    await add.focus();
    const addFocus = await linkState(page, homeAddSelector);
    assert(addFocus.outlineStyle === "solid" && Number.parseFloat(addFocus.outlineWidth) >= 3, `${viewport.width}: add focus is not clearly visible`);

    const cartBefore = await page.locator("[data-cart-count]").first().innerText();
    await add.click();
    const cartAfter = await page.locator("[data-cart-count]").first().innerText();
    assert(cartAfter !== cartBefore, `${viewport.width}: add-to-cart did not update cart count`);

    const slider = page.locator(".slider-arrow-v1.right");
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    await slider.press("Enter");
    await page.waitForTimeout(700);
    assert(await slider.getAttribute("tabindex") !== "-1", `${viewport.width}: slider arrow is not keyboard operable`);

    await page.goto(`${base}/menu/`, { waitUntil: "load" });
    const menuTitle = await linkState(page, ".pommy-menu-card h3 a");
    const viewAction = await linkState(page, ".pommy-menu-card-actions .button-secondary");
    assert(menuTitle.decoration === "none", `${viewport.width}: menu title is underlined`);
    assert(viewAction.decoration === "none", `${viewport.width}: View action is underlined`);
    await page.locator(".pommy-menu-card-actions .button-secondary").first().focus();
    const viewFocus = await linkState(page, ".pommy-menu-card-actions .button-secondary");
    assert(viewFocus.outlineStyle === "solid" && Number.parseFloat(viewFocus.outlineWidth) >= 3, `${viewport.width}: View focus is not visible`);

    if (viewport.width <= 768) {
      await page.goto(`${base}/`, { waitUntil: "load" });
      await page.locator(".w-nav-button").click();
      await page.locator(".w-nav-menu").waitFor({ state: "visible" });
      await page.waitForTimeout(450);
      const mobileMenu = await page.locator(".w-nav-menu").evaluate(element => {
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          links: Array.from(element.querySelectorAll("a")).map(link => {
            const linkRect = link.getBoundingClientRect();
            return { top: linkRect.top, bottom: linkRect.bottom };
          })
        };
      });
      assert(mobileMenu.top >= 0 && mobileMenu.top < viewport.height, `${viewport.width}: mobile menu is offscreen`);
      assert(mobileMenu.bottom <= viewport.height, `${viewport.width}: mobile menu extends beyond the viewport`);
      assert(mobileMenu.links.length > 0 && mobileMenu.links.every(link => link.top >= 0 && link.bottom <= viewport.height), `${viewport.width}: mobile menu links are offscreen`);
      await page.locator(".w-nav-button").click();
      await page.locator(".w-nav-menu").waitFor({ state: "hidden" });
    }

    assert(errors.length === 0, `${viewport.width}: browser errors: ${errors.join(" | ")}`);
    results.push({ viewport: viewport.width, ...motion, errors: errors.length });
    await context.close();
  }

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${base}/`, { waitUntil: "load" });
  const reducedResult = await reducedPage.evaluate(() => ({
    classApplied: document.documentElement.classList.contains("pommy-reduced-motion"),
    autoplayDisabled: Array.from(document.querySelectorAll(".w-slider[data-autoplay]")).every(slider => slider.getAttribute("data-autoplay") === "false"),
    hidden: Array.from(document.querySelectorAll(".pommy-original-home [data-w-id]")).filter(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85).length,
    fallback: window.__pommyMotionMetrics?.fallbackActivations?.length || 0
  }));
  assert(reducedResult.classApplied, "Reduced-motion class was not applied");
  assert(reducedResult.autoplayDisabled, "Reduced-motion slider autoplay remained enabled");
  assert(reducedResult.hidden === 0, "Reduced-motion page contains hidden interaction targets");
  assert(reducedResult.fallback === 0, "Fallback ran for a reduced-motion user");
  await reduced.close();

  await browser.close();
  console.log(JSON.stringify({ base, results, reducedMotion: reducedResult, status: "passed" }, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

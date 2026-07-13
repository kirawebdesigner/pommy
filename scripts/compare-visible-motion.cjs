const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const originalUrl = process.env.POMMY_ORIGINAL_URL || "http://127.0.0.1:8110";
const pommyUrl = process.env.POMMY_LIVE_URL || "https://pommydemo.netlify.app";
const outputRoot = path.resolve(process.env.POMMY_MOTION_COMPARE_DIR || ".codex-screenshots/motion-comparison-before");
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const requestedWidths = new Set((process.env.POMMY_MOTION_WIDTHS || "").split(",").map(Number).filter(Boolean));
const viewports = [
  { width: 1440, height: 1000, cpu: 1 },
  { width: 1024, height: 900, cpu: 1 },
  { width: 768, height: 900, cpu: 1 },
  { width: 390, height: 844, cpu: 4 }
].filter(viewport => !requestedWidths.size || requestedWidths.has(viewport.width));

const targets = [
  { name: "hero-heading", selector: '[data-w-id="687ff863-1ec1-bccd-92f7-679c7a34b916"]' },
  { name: "hero-copy", selector: '[data-w-id="18c931e0-7b9a-fa72-69e7-9fdbea918735"]' },
  { name: "hero-image", selector: '[data-w-id="90122aae-60ae-33c5-c958-d7fe44f86361"]' },
  { name: "category-heading", selector: '[data-w-id="e4c3bb7f-ac95-699e-bd63-e013c6263f86"]' },
  { name: "category-card-1", selector: "._4-column-grid > .w-dyn-item:has(.menu-category-card)", index: 0 },
  { name: "category-card-4", selector: "._4-column-grid > .w-dyn-item:has(.menu-category-card)", index: 3 },
  { name: "about-copy", selector: '[data-w-id="08e9f933-a2c4-be53-bba8-efe485bf9535"]' },
  { name: "about-image", selector: '[data-w-id="1dcc2e1a-7dd1-91f8-614c-ac4ea06931bd"]' },
  { name: "about-card", selector: '[data-w-id="01c90352-be98-8fb5-9058-533f2aa55a3e"]' },
  { name: "products-heading", selector: '[data-w-id="ed55ef11-3a76-882b-a053-9be0ff301d14"]' },
  { name: "product-card-1", selector: ".menu-grid > .w-dyn-item", index: 0 },
  { name: "product-card-4", selector: ".menu-grid > .w-dyn-item", index: 3 },
  { name: "product-card-8", selector: ".menu-grid > .w-dyn-item", index: 7 },
  { name: "cta-heading", selector: '[data-w-id="4c600c81-cae4-74aa-84a0-de68746e12de"]' },
  { name: "cta-image", selector: '[data-w-id="4c600c81-cae4-74aa-84a0-de68746e12e7"]' },
  { name: "trust-heading", selector: '[data-w-id="e826389b-52a5-f15b-300b-8ecb0cacc41c"]' },
  { name: "trust-slider", selector: '[data-w-id="13ae4adb-993f-1830-95d5-5dde326abd83"]' },
  { name: "blog-grid", selector: '[data-w-id="c566be7d-bfce-fa09-ba5c-0292f02c3210"]' },
  { name: "blog-side-1", selector: ".blog-grid > .w-dyn-list:nth-child(2) .w-dyn-item", index: 0 },
  { name: "blog-side-4", selector: ".blog-grid > .w-dyn-list:nth-child(2) .w-dyn-item", index: 3 },
  { name: "contact-heading", selector: '[data-w-id="5f58b64f-8a57-4a45-7318-4897091c7bd9"]' },
  { name: "contact-card", selector: '[data-w-id="baeee943-8869-8b06-2e94-48674f0d6d94"]' },
  { name: "contact-background", selector: '[data-w-id="08227222-e73e-68fe-2cb5-569054c87cc7"]' },
  { name: "gallery-image", selector: ".instagram-grid .image.instagram", index: 0 },
  { name: "footer-bottom", selector: '[data-w-id="eea6b3e0-d9ff-e6b5-76a4-5c0b4254248e"]' }
];

function summarize(samples) {
  const byTarget = new Map();
  samples.forEach(sample => {
    if (!byTarget.has(sample.name)) byTarget.set(sample.name, []);
    byTarget.get(sample.name).push(sample);
  });
  return targets.map(target => {
    const values = byTarget.get(target.name) || [];
    const opacityValues = [...new Set(values.map(value => Math.round(value.opacity * 100) / 100))];
    const transformValues = [...new Set(values.map(value => value.transform))];
    const progressing = values.filter(value => value.opacity > .02 && value.opacity < .98);
    const firstHiddenIndex = values.findIndex(value => value.opacity < .15);
    const visibleBeforeHidden = firstHiddenIndex > 0 && values.slice(0, firstHiddenIndex).some(value => value.opacity > .85);
    const first = values[0] || null;
    const last = values.at(-1) || null;
    return {
      name: target.name,
      samples: values.length,
      first,
      last,
      opacityValues,
      transformValueCount: transformValues.length,
      intermediateOpacitySamples: progressing.length,
      visibleBeforeHidden,
      perceptibleTransition: opacityValues.length >= 3 || transformValues.length >= 4
    };
  });
}

async function installSampler(page) {
  await page.addInitScript(targetDefinitions => {
    window.__visibleMotionSamples = [];
    window.__visibleMotionSampling = true;
    const lastValues = new Map();
    const started = performance.now();

    function sample(now) {
      if (!window.__visibleMotionSampling) return;
      targetDefinitions.forEach(target => {
        const elements = document.querySelectorAll(target.selector);
        const element = elements[target.index || 0];
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const elapsed = now - started;
        if (elapsed > 1800 && (rect.bottom < -innerHeight * .15 || rect.top > innerHeight * 1.15)) return;
        const style = getComputedStyle(element);
        const opacity = Number.parseFloat(style.opacity || "1");
        const transform = style.transform;
        const previous = lastValues.get(target.name);
        const changed = !previous || Math.abs(previous.opacity - opacity) >= .015 || previous.transform !== transform || now - previous.time >= 80;
        if (!changed) return;
        const value = {
          name: target.name,
          time: Math.round(elapsed),
          scrollY: Math.round(scrollY),
          top: Math.round(rect.top),
          opacity,
          transform,
          animations: element.getAnimations().length
        };
        lastValues.set(target.name, { opacity, transform, time: now });
        window.__visibleMotionSamples.push(value);
      });
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, targets);
}

async function naturalScroll(page, duration) {
  await page.evaluate(async scrollDuration => {
    const endY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    await new Promise(resolve => {
      const started = performance.now();
      function frame(now) {
        const progress = Math.min(1, (now - started) / scrollDuration);
        const eased = .5 - Math.cos(Math.PI * progress) / 2;
        scrollTo(0, endY * eased);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, duration);
}

(async () => {
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const results = [];

  for (const viewport of viewports) {
    for (const site of [{ name: "original", url: originalUrl }, { name: "pommy", url: pommyUrl }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      if (viewport.cpu > 1) await session.send("Emulation.setCPUThrottlingRate", { rate: viewport.cpu });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await installSampler(page);
      const response = await page.goto(site.url, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(1800);
      await naturalScroll(page, viewport.cpu > 1 ? 30000 : 22000);
      await page.waitForTimeout(1200);
      await page.evaluate(() => { window.__visibleMotionSampling = false; });
      const samples = await page.evaluate(() => window.__visibleMotionSamples);
      const result = {
        site: site.name,
        url: site.url,
        viewport: `${viewport.width}x${viewport.height}`,
        cpuRate: viewport.cpu,
        status: response?.status() || 0,
        errors,
        summary: summarize(samples),
        samples
      };
      const prefix = `${site.name}-${viewport.width}`;
      fs.writeFileSync(path.join(outputRoot, `${prefix}.json`), `${JSON.stringify(result, null, 2)}\n`);
      await page.screenshot({ path: path.join(outputRoot, `${prefix}.png`), fullPage: true });
      results.push({
        site: site.name,
        viewport: result.viewport,
        visiblyAnimatedTargets: result.summary.filter(item => item.perceptibleTransition).map(item => item.name),
        staticTargets: result.summary.filter(item => item.samples && !item.perceptibleTransition).map(item => item.name),
        missingTargets: result.summary.filter(item => !item.samples).map(item => item.name),
        errors: errors.length
      });
      await context.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(outputRoot, "summary.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify({ outputRoot, results }, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

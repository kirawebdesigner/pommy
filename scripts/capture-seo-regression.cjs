"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = (process.argv[2] || "http://127.0.0.1:8765").replace(/\/$/, "");
const output = path.resolve(process.env.POMMY_VISUAL_DIR || ".codex-screenshots/seo-after");
const chrome = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const widths = [320, 375, 390, 430, 768, 1024, 1440, 1920];

function roundedRect(rect, scrollY) {
  return rect ? {
    x: Math.round(rect.x),
    y: Math.round(rect.y + scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  } : null;
}

async function capturePageSegments(page, outputDirectory, width, viewportHeight, documentHeight) {
  const scrollPositions = [];
  for (let y = 0; y < documentHeight; y += viewportHeight) {
    scrollPositions.push(Math.min(y, Math.max(0, documentHeight - viewportHeight)));
  }
  const positions = [...new Set(scrollPositions)];
  const segments = [];
  const segmentDirectory = path.join(outputDirectory, "segments");
  fs.mkdirSync(segmentDirectory, { recursive: true });

  for (const [index, y] of positions.entries()) {
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(120);
    const file = `home-${width}-${String(index).padStart(2, "0")}-y${y}.png`;
    await page.screenshot({ path: path.join(segmentDirectory, file) });
    segments.push({ index, y, file });
  }

  return segments;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const metrics = [];

  for (const width of widths) {
    const viewportHeight = width <= 430 ? 844 : width === 768 ? 1024 : 1000;
    const context = await browser.newContext({ viewport: { width, height: viewportHeight }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.route("https://cruvatqjbignywiwoszh.supabase.co/**", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && !/503 \(Service Unavailable\)/.test(message.text())) errors.push(message.text());
    });
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForFunction(() => window.Pommy && window.Pommy.ready);
    await page.evaluate(() => window.Pommy.ready);
    await page.evaluate(async () => {
      const step = Math.max(400, Math.floor(innerHeight * 0.75));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      scrollTo(0, document.documentElement.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 350));
      scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
      return {
        scrollY,
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth },
        header: rect(".header"),
        hero: rect(".section.home-hero"),
        heroCopy: rect(".pommy-home-hero-copy"),
        heroImage: rect(".home-hero-image"),
        categories: rect("#browse-menu"),
        footer: rect("footer.footer"),
        h1: document.querySelector("h1")?.textContent.trim() || "",
        h1Count: document.querySelectorAll("h1").length,
        images: document.images.length,
        broken: Array.from(document.images).filter(image => image.complete && image.naturalWidth === 0).length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });
    const segments = await capturePageSegments(page, output, width, viewportHeight, data.document.height);
    metrics.push({
      width,
      errors,
      document: data.document,
      header: roundedRect(data.header, data.scrollY),
      hero: roundedRect(data.hero, data.scrollY),
      heroCopy: roundedRect(data.heroCopy, data.scrollY),
      heroImage: roundedRect(data.heroImage, data.scrollY),
      categories: roundedRect(data.categories, data.scrollY),
      footer: roundedRect(data.footer, data.scrollY),
      h1: data.h1,
      h1Count: data.h1Count,
      images: data.images,
      broken: data.broken,
      overflow: data.overflow,
      segments
    });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(output, "metrics.json"), JSON.stringify(metrics, null, 2));

  const before = JSON.parse(fs.readFileSync(path.resolve(".codex-screenshots/seo-before/metrics.json"), "utf8"));
  const differences = metrics.map(current => {
    const baseline = before.find(entry => entry.width === current.width);
    const geometry = {};
    for (const key of ["document", "header", "hero", "heroCopy", "heroImage", "categories", "footer"]) {
      geometry[key] = {};
      for (const property of Object.keys(current[key] || {})) geometry[key][property] = current[key][property] - baseline[key][property];
    }
    return {
      width: current.width,
      geometry,
      h1Equal: current.h1 === baseline.h1,
      h1Count: current.h1Count,
      broken: current.broken,
      overflow: current.overflow,
      errors: current.errors
    };
  });
  fs.writeFileSync(path.join(output, "comparison.json"), JSON.stringify(differences, null, 2));
  console.log(JSON.stringify(differences, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

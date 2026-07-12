const { chromium } = require("C:/Users/kirub/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("fs");

const base = process.env.POMMY_BASE_URL || "http://127.0.0.1:8098";
const output = ".codex-screenshots/template-reference/sections.json";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/template/home/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator(".page-wrapper").waitFor();
  const sections = await page.evaluate(() => Array.from(document.querySelectorAll(".page-wrapper > .section, .page-wrapper > .narrow-section")).map((section, index) => ({
    index: index + 1,
    className: section.className,
    text: section.innerText.replace(/\s+/g, " ").trim().slice(0, 240),
    height: Math.round(section.getBoundingClientRect().height),
    directChildren: Array.from(section.children).map(child => child.className || child.tagName),
    ids: Array.from(section.querySelectorAll("[data-w-id]")).map(element => ({ id: element.dataset.wId, className: element.className })),
    html: section.outerHTML
  })));
  fs.mkdirSync(".codex-screenshots/template-reference", { recursive: true });
  fs.writeFileSync(output, JSON.stringify(sections, null, 2));
  console.log(JSON.stringify(sections.map(({ html, ...section }) => section), null, 2));
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

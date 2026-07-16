"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const port = 8791;
const chromeExecutable = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function publicFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "template", ".codex-screenshots", "admin"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) publicFiles(target, output);
    else if (entry.name === "index.html") output.push(target);
  }
  return output;
}

function routeFor(file) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  return relative === "index.html" ? "/" : "/" + relative.replace(/index\.html$/, "");
}

function fileForRequest(requestPath) {
  let decoded;
  try { decoded = decodeURIComponent(requestPath.split("?")[0]); }
  catch (error) { return null; }
  let relative = decoded.replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) && target !== root) return null;
  return target;
}

const server = http.createServer((request, response) => {
  const target = fileForRequest(request.url || "/");
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(target).pipe(response);
});

async function main() {
  const files = publicFiles(root);
  server.listen(port, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await page.route("**/assets/js/webflow-original.js", (route) => route.abort());
  await page.route("https://cruvatqjbignywiwoszh.supabase.co/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ message: "Prerender uses the canonical bundled menu." })
  }));

  for (const [index, file] of files.entries()) {
    const route = routeFor(file);
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.Pommy && window.Pommy.ready);
    await page.evaluate(() => window.Pommy.ready);
    await page.waitForTimeout(20);

    const prefix = await page.evaluate(() => {
      const wrapper = document.querySelector(".page-wrapper");
      if (!wrapper) throw new Error("Missing .page-wrapper");

      const sourceImages = Array.from(wrapper.querySelectorAll("img"));
      const clone = wrapper.cloneNode(true);
      Array.from(clone.querySelectorAll("img")).forEach((image, imageIndex) => {
        const source = sourceImages[imageIndex];
        if (!image.hasAttribute("width") && source && source.naturalWidth) image.setAttribute("width", String(source.naturalWidth));
        if (!image.hasAttribute("height") && source && source.naturalHeight) image.setAttribute("height", String(source.naturalHeight));
      });
      const skip = document.querySelector(".pommy-skip-link");
      return (skip ? skip.outerHTML + "\n  " : "") + clone.outerHTML;
    });

    let source = fs.readFileSync(file, "utf8");
    const scriptMarker = '  <script src="/assets/data/menu.js"></script>';
    const markerIndex = source.indexOf(scriptMarker);
    if (markerIndex === -1) throw new Error(`Missing script marker in ${file}`);
    const bodyIndex = source.indexOf("<body>");
    if (bodyIndex === -1 || bodyIndex > markerIndex) throw new Error(`Missing body in ${file}`);
    source = source.slice(0, bodyIndex) + "<body>\n  " + prefix + "\n" + source.slice(markerIndex);
    fs.writeFileSync(file, source);
    process.stdout.write(`\rPrerendered ${index + 1}/${files.length}: ${route.padEnd(72)}`);
  }

  process.stdout.write("\n");
  await browser.close();
  server.close();
}

main().catch((error) => {
  server.close();
  console.error(error);
  process.exitCode = 1;
});

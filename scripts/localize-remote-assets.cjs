const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";

function ensure(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  async function fetchTo(url, file) {
    let body;
    try {
      const response = await context.request.get(url, { timeout: 60000 });
      if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
      body = await response.body();
    } catch (requestError) {
      const downloadPromise = page.waitForEvent("download", { timeout: 60000 }).catch(() => null);
      const response = await page.goto(url, { waitUntil: "commit", timeout: 60000 }).catch(error => {
        if (!/Download is starting/.test(error.message)) throw error;
        return null;
      });
      if (response) body = await response.body();
      else {
        const download = await downloadPromise;
        if (!download) throw requestError;
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        body = Buffer.concat(chunks);
      }
    }
    ensure(file);
    fs.writeFileSync(file, body);
    console.log(`${file} ${body.length}`);
    return body;
  }

  const assets = [
    ["https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=6165adad51c39da51d4fe6cd", "assets/js/jquery-3.5.1.min.js"],
    ["https://cdn.prod.website-files.com/6165adad51c39da51d4fe6cd/616dab73b901c1c8bfbcab77_iconsrestaurantextemplate.woff2", "assets/fonts/pommy-ui-icons.woff2"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39da51d4fe6cd/6172c6f7c25af2402ed33683_lottieflow-menu-nav-08-FFFFFF-easey.json", "assets/animations/menu-toggle.json"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39da51d4fe6cd/616d9a0b651769674022e7ba_home-hero-restaurante-x-template.jpg", "assets/images/menu/home-hero.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39dabac4fe6f1/616dc4908009251d2f5ac06b_egg-toast-restaurante-x-template.jpg", "assets/images/menu/breakfast.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39dabac4fe6f1/616dca333c0bd679a77bec56_classic-burger-restaurante-x-template.jpg", "assets/images/menu/burger.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39da51d4fe6cd/616da2c376225e7ff4d983c1_Instagram-05-restaurante-x-template.jpg", "assets/images/menu/pizza.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39dabac4fe6f1/616dc4d28ae55806547e5dba_chicken-burger-restaurante-x-template.jpg", "assets/images/menu/chicken.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39dabac4fe6f1/616dc9ba43f4163d5f7b436e_chocolate-milkshake-restaurante-x-template.jpg", "assets/images/menu/shake.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39dabac4fe6f1/616dc414d54d4e45ccac841f_regular-soda-restaurante-x-template.jpg", "assets/images/menu/drink.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39da51d4fe6cd/616da2c3a17185be94e60f4b_Instagram-03-restaurante-x-template.jpg", "assets/images/menu/hot-drink.jpg"],
    ["https://wubflow-shield.NOCODEXPORT.DEV/6165adad51c39da51d4fe6cd/616da2c3a17185be94e60f4b_Instagram-03-restaurante-x-template.jpg", "assets/images/menu/blog-food.jpg"]
  ];

  for (const [url, file] of assets) await fetchTo(url, file);

  const fontCssUrl = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap";
  const fontCssResponse = await context.request.get(fontCssUrl, { timeout: 60000 });
  let fontCss = (await fontCssResponse.body()).toString("utf8");
  const fontUrls = [...new Set([...fontCss.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(match => match[1]))];
  for (let index = 0; index < fontUrls.length; index += 1) {
    const local = `assets/fonts/dm-sans-${index + 1}.woff2`;
    await fetchTo(fontUrls[index], local);
    fontCss = fontCss.replaceAll(fontUrls[index], `/assets/fonts/dm-sans-${index + 1}.woff2`);
  }
  ensure("assets/css/dm-sans.css");
  fs.writeFileSync("assets/css/dm-sans.css", fontCss);

  let webflowCss = fs.readFileSync("assets/css/webflow-original.css", "utf8");
  webflowCss = webflowCss.replace("https://cdn.prod.website-files.com/6165adad51c39da51d4fe6cd/616dab73b901c1c8bfbcab77_iconsrestaurantextemplate.woff2", "/assets/fonts/pommy-ui-icons.woff2");
  fs.writeFileSync("assets/css/webflow-original.css", webflowCss);
  await browser.close();
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});

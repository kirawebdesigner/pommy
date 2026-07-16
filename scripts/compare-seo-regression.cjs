"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baselineDirectory = path.resolve(process.argv[2] || ".codex-screenshots/seo-final-baseline");
const currentDirectory = path.resolve(process.argv[3] || ".codex-screenshots/seo-final-current");
const outputPath = path.join(currentDirectory, "visual-comparison.json");
const chrome = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

function readJson(directory, file) {
  return JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
}

function geometryDifferences(baseline, current) {
  const differences = {};
  for (const key of ["document", "header", "hero", "heroCopy", "heroImage", "categories", "footer"]) {
    differences[key] = {};
    for (const property of Object.keys(current[key] || {})) {
      differences[key][property] = current[key][property] - baseline[key][property];
    }
  }
  return differences;
}

(async () => {
  const baselineMetrics = readJson(baselineDirectory, "metrics.json");
  const currentMetrics = readJson(currentDirectory, "metrics.json");
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage();
  const results = [];

  for (const current of currentMetrics) {
    const baseline = baselineMetrics.find((entry) => entry.width === current.width);
    if (!baseline) throw new Error(`Missing baseline metrics for ${current.width}px`);
    if (baseline.segments.length !== current.segments.length) {
      throw new Error(`Segment count changed at ${current.width}px`);
    }

    let totalPixels = 0;
    let totalDifference = 0;
    let changedPixels = 0;
    let highDifferencePixels = 0;
    let maximumDifference = 0;

    for (let index = 0; index < current.segments.length; index += 1) {
      const baselineSegment = baseline.segments[index];
      const currentSegment = current.segments[index];
      if (baselineSegment.y !== currentSegment.y) {
        throw new Error(`Segment position changed at ${current.width}px segment ${index}`);
      }
      const baselineImage = fs.readFileSync(path.join(baselineDirectory, "segments", baselineSegment.file)).toString("base64");
      const currentImage = fs.readFileSync(path.join(currentDirectory, "segments", currentSegment.file)).toString("base64");
      const comparison = await page.evaluate(async ({ baselineImage, currentImage }) => {
        function load(source) {
          return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = "data:image/png;base64," + source;
          });
        }
        const [baseline, current] = await Promise.all([load(baselineImage), load(currentImage)]);
        if (baseline.width !== current.width || baseline.height !== current.height) {
          return { dimensionsChanged: true };
        }
        const canvas = document.createElement("canvas");
        canvas.width = baseline.width;
        canvas.height = baseline.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(baseline, 0, 0);
        const left = context.getImageData(0, 0, canvas.width, canvas.height).data;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(current, 0, 0);
        const right = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        let changed = 0;
        let high = 0;
        let maximum = 0;
        for (let pixel = 0; pixel < left.length; pixel += 4) {
          const difference = (
            Math.abs(left[pixel] - right[pixel]) +
            Math.abs(left[pixel + 1] - right[pixel + 1]) +
            Math.abs(left[pixel + 2] - right[pixel + 2])
          ) / 3;
          sum += difference;
          if (difference > 0.5) changed += 1;
          if (difference > 20) high += 1;
          maximum = Math.max(maximum, difference);
        }
        return {
          dimensionsChanged: false,
          pixels: canvas.width * canvas.height,
          sum,
          changed,
          high,
          maximum
        };
      }, { baselineImage, currentImage });
      if (comparison.dimensionsChanged) throw new Error(`Screenshot dimensions changed at ${current.width}px segment ${index}`);
      totalPixels += comparison.pixels;
      totalDifference += comparison.sum;
      changedPixels += comparison.changed;
      highDifferencePixels += comparison.high;
      maximumDifference = Math.max(maximumDifference, comparison.maximum);
    }

    results.push({
      width: current.width,
      geometry: geometryDifferences(baseline, current),
      h1Equal: baseline.h1 === current.h1,
      h1Count: current.h1Count,
      broken: current.broken,
      overflow: current.overflow,
      errors: current.errors,
      segments: current.segments.length,
      meanAbsoluteRgbDifference: totalDifference / totalPixels,
      changedPixelRatio: changedPixels / totalPixels,
      highDifferencePixelRatio: highDifferencePixels / totalPixels,
      maximumDifference
    });
  }

  await browser.close();
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});

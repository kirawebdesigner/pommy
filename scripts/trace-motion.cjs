const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = (process.env.POMMY_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const outputRoot = path.resolve(process.env.POMMY_MOTION_TRACE_DIR || ".codex-screenshots/motion-trace");
const chromeExecutable = process.env.POMMY_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const requestedWidths = new Set((process.env.POMMY_MOTION_WIDTHS || "").split(",").map(Number).filter(Boolean));
const viewports = [
  { name: "1440", width: 1440, height: 1000, cpuRate: 1 },
  { name: "1024", width: 1024, height: 900, cpuRate: 1 },
  { name: "768", width: 768, height: 900, cpuRate: 1 },
  { name: "390", width: 390, height: 844, cpuRate: 4 }
].filter(viewport => !requestedWidths.size || requestedWidths.has(viewport.width));

function readTraceStream(session, stream) {
  return (async () => {
    let content = "";
    while (true) {
      const chunk = await session.send("IO.read", { handle: stream });
      content += chunk.data;
      if (chunk.eof) break;
    }
    await session.send("IO.close", { handle: stream });
    return content;
  })();
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function summarizeTrace(trace) {
  const events = trace.traceEvents || [];
  const tasks = events.filter(event => event.ph === "X" && /^(RunTask|Task)$/.test(event.name) && event.dur >= 50000);
  const layouts = events.filter(event => event.ph === "X" && event.name === "Layout");
  const styleRecalcs = events.filter(event => event.ph === "X" && /^(RecalculateStyles|UpdateLayoutTree)$/.test(event.name));
  const drawFrames = events.filter(event => event.name === "AnimationFrame::Presentation" && typeof event.ts === "number").map(event => event.ts).sort((a, b) => a - b);
  const frameIntervals = drawFrames.slice(1).map((timestamp, index) => (timestamp - drawFrames[index]) / 1000).filter(value => value > 0 && value < 1000);
  const durationMs = items => Math.round(items.reduce((total, item) => total + (item.dur || 0), 0) / 1000 * 100) / 100;
  return {
    longTasks: tasks.length,
    longestTaskMs: Math.round(Math.max(0, ...tasks.map(task => task.dur / 1000)) * 100) / 100,
    layoutEvents: layouts.length,
    layoutDurationMs: durationMs(layouts),
    styleRecalcEvents: styleRecalcs.length,
    styleRecalcDurationMs: durationMs(styleRecalcs),
    drawFrames: drawFrames.length,
    frameIntervalP50Ms: Math.round(percentile(frameIntervals, .5) * 100) / 100,
    frameIntervalP95Ms: Math.round(percentile(frameIntervals, .95) * 100) / 100,
    maxFrameIntervalMs: Math.round(Math.max(0, ...frameIntervals) * 100) / 100,
    intervalsOver33Ms: frameIntervals.filter(value => value > 33.34).length
  };
}

async function installObservers(page) {
  await page.addInitScript(() => {
    window.__pommyMotionAudit = { longTasks: [], layoutShifts: [], styleMutations: [] };
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(entry => window.__pommyMotionAudit.longTasks.push({ startTime: entry.startTime, duration: entry.duration }));
      }).observe({ type: "longtask", buffered: true });
    } catch {}
    try {
      new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (!entry.hadRecentInput) window.__pommyMotionAudit.layoutShifts.push({
            startTime: entry.startTime,
            value: entry.value,
            sources: (entry.sources || []).map(source => ({
              node: source.node?.id ? `#${source.node.id}` : source.node?.className ? `.${String(source.node.className).trim().replace(/\s+/g, ".")}` : source.node?.tagName || "unknown",
              previousRect: source.previousRect,
              currentRect: source.currentRect
            }))
          });
        });
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    document.addEventListener("DOMContentLoaded", () => {
      const targetKeys = new WeakMap();
      document.querySelectorAll("[data-w-id]").forEach((element, index) => {
        targetKeys.set(element, `${element.dataset.wId || "target"}:${index}`);
      });
      const observer = new MutationObserver(records => {
        records.forEach(record => {
          const element = record.target;
          if (!(element instanceof HTMLElement) || !element.dataset.wId) return;
          window.__pommyMotionAudit.styleMutations.push({
            time: performance.now(),
            key: targetKeys.get(element) || element.dataset.wId,
            id: element.dataset.wId,
            inlineStyle: element.getAttribute("style") || ""
          });
        });
      });
      observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["style"] });
    }, { once: true });
  });
}

async function naturalScroll(page, duration) {
  await page.evaluate(async scrollDuration => {
    const startY = window.scrollY;
    const endY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    await new Promise(resolve => {
      const started = performance.now();
      function frame(now) {
        const progress = Math.min(1, (now - started) / scrollDuration);
        const eased = .5 - Math.cos(Math.PI * progress) / 2;
        scrollTo(0, startY + (endY - startY) * eased);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }, duration);
}

(async () => {
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chromeExecutable });
  const summaries = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    const runtimeErrors = [];
    const consoleErrors = [];
    const performanceWarnings = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
      if (/forced reflow|forced layout/i.test(message.text())) performanceWarnings.push(message.text());
    });
    await installObservers(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: viewport.cpuRate });
    await session.send("Tracing.start", {
      categories: "devtools.timeline,blink.user_timing,loading,disabled-by-default-devtools.timeline",
      transferMode: "ReturnAsStream"
    });

    const response = await page.goto(`${baseUrl}/`, { waitUntil: "load", timeout: 60000 });
    await page.locator("#main-content").waitFor({ state: "attached" });
    await page.waitForFunction(() => {
      try { return Boolean(window.Webflow?.require("ix2")?.store?.getState().ixSession.active); }
      catch { return false; }
    }, null, { timeout: 15000 });
    await page.waitForTimeout(1400);
    await page.evaluate(() => { window.__pommyMotionAudit.scrollStarted = performance.now(); });
    await naturalScroll(page, viewport.cpuRate > 1 ? 10000 : 7500);
    await page.evaluate(() => { window.__pommyMotionAudit.scrollEnded = performance.now(); });
    await page.waitForTimeout(800);

    const slider = page.locator(".slider-arrow-v1.right");
    await slider.scrollIntoViewIfNeeded();
    await slider.click();
    await page.waitForTimeout(700);
    if (viewport.width >= 1024) {
      await page.locator(".button-primary").first().hover();
      await page.waitForTimeout(350);
    } else {
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator(".w-nav-button").click();
      await page.locator(".w-nav-menu").waitFor({ state: "visible", timeout: 5000 });
      await page.waitForTimeout(500);
      await page.locator(".w-nav-button").click();
      await page.waitForTimeout(500);
    }

    const browserMetrics = await page.evaluate(() => {
      const audit = window.__pommyMotionAudit;
      const runtimeMetrics = window.__pommyMotionMetrics;
      const writesAfterFallback = {};
      (runtimeMetrics?.fallbackActivations || []).forEach(fallback => {
        writesAfterFallback[fallback.key] = audit.styleMutations.filter(mutation => mutation.key === fallback.key && mutation.time > fallback.time + 20).length;
      });
      const ixState = window.Webflow?.require("ix2")?.store?.getState();
      const domIds = new Set(Array.from(document.querySelectorAll("[data-w-id]")).map(element => element.dataset.wId));
      const matchingEvents = Object.values(ixState?.ixData?.events || {}).filter(event => {
        const id = event.target?.id?.split("|").pop();
        return id && domIds.has(id);
      }).map(event => ({
        id: event.id,
        eventTypeId: event.eventTypeId,
        actionListId: event.action?.config?.actionListId,
        delay: event.action?.config?.delay || 0,
        scrollOffsetValue: event.config?.scrollOffsetValue,
        scrollOffsetUnit: event.config?.scrollOffsetUnit
      }));
      return {
        longTasks: audit.longTasks,
        scrollLongTasks: audit.longTasks.filter(task => task.startTime >= audit.scrollStarted && task.startTime <= audit.scrollEnded),
        layoutShiftScore: audit.layoutShifts.reduce((total, shift) => total + shift.value, 0),
        layoutShifts: audit.layoutShifts,
        styleMutationCount: audit.styleMutations.length,
        transitionMutations: audit.styleMutations.filter(mutation => /transition/i.test(mutation.inlineStyle)).slice(0, 100),
        fallbackActivations: runtimeMetrics?.fallbackActivations || [],
        nativeProgressChecks: runtimeMetrics?.nativeProgressChecks || 0,
        lightweightRevealTargets: runtimeMetrics?.lightweightRevealTargets || 0,
        lightweightRevealActivations: runtimeMetrics?.lightweightRevealActivations || 0,
        nativeWritesAfterFallback: writesAfterFallback,
        matchingIxEvents: matchingEvents,
        hiddenTargets: Array.from(document.querySelectorAll(".pommy-original-home [data-w-id]")).filter(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85).map(element => ({ id: element.dataset.wId, opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform })),
        hiddenLightweightTargets: Array.from(document.querySelectorAll(".pommy-card-reveal")).filter(element => element.offsetParent !== null && Number.parseFloat(getComputedStyle(element).opacity || "1") < .85).map(element => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform })),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    const tracingComplete = new Promise(resolve => session.once("Tracing.tracingComplete", resolve));
    await session.send("Tracing.end");
    const { stream } = await tracingComplete;
    const traceText = await readTraceStream(session, stream);
    const trace = JSON.parse(traceText);
    const traceFile = path.join(outputRoot, `${viewport.name}.trace.json`);
    fs.writeFileSync(traceFile, traceText);
    const result = {
      viewport: `${viewport.width}x${viewport.height}`,
      cpuRate: viewport.cpuRate,
      status: response?.status() || 0,
      ...summarizeTrace(trace),
      ...browserMetrics,
      runtimeErrors,
      consoleErrors,
      performanceWarnings,
      traceFile
    };
    fs.writeFileSync(path.join(outputRoot, `${viewport.name}.json`), `${JSON.stringify(result, null, 2)}\n`);
    summaries.push({
      viewport: result.viewport,
      cpuRate: result.cpuRate,
      longTasks: result.longTasks.length,
      scrollLongTasks: result.scrollLongTasks.length,
      longestTaskMs: result.longestTaskMs,
      layoutShiftScore: result.layoutShiftScore,
      fallbackActivations: result.fallbackActivations.length,
      nativeWritesAfterFallback: Object.values(result.nativeWritesAfterFallback).reduce((total, count) => total + count, 0),
      hiddenTargets: result.hiddenTargets.length,
      hiddenLightweightTargets: result.hiddenLightweightTargets.length,
      lightweightRevealActivations: result.lightweightRevealActivations,
      frameIntervalP95Ms: result.frameIntervalP95Ms,
      intervalsOver33Ms: result.intervalsOver33Ms,
      overflow: result.overflow,
      runtimeErrors: result.runtimeErrors.length,
      consoleErrors: result.consoleErrors.length,
      forcedReflowWarnings: result.performanceWarnings.length
    });
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(outputRoot, "summary.json"), `${JSON.stringify(summaries, null, 2)}\n`);
  console.log(JSON.stringify({ outputRoot, baseUrl, summaries }, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

#!/usr/bin/env node
/** Phone-land smoke: static boot must hide, HUD must appear, no pageerror. */
import { chromium } from "playwright";

const url = process.env.SMOKE_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  hasTouch: true,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
});
const page = await context.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
let last = {};
let ok = false;
for (let i = 0; i < 16; i++) {
  await page.waitForTimeout(700);
  last = await page.evaluate(() => {
    const st = document.getElementById("lc-static-boot");
    return {
      static: st ? getComputedStyle(st).display : "gone",
      slim: !!document.querySelector(".hud-slim"),
      overlay: !!document.querySelector(".title-land"),
      booted: !!window.__LC_BOOTED,
      waking: /Waking the city/i.test(document.body.innerText || ""),
    };
  });
  if (last.slim && last.static === "none" && !last.waking) {
    ok = true;
    break;
  }
}

await browser.close();
const fatal = errs.filter((e) => !/Download the React DevTools|GPU stall/i.test(e));
if (!ok || fatal.length) {
  console.error("LAND_SMOKE_FAIL", JSON.stringify({ last, fatal: fatal.slice(0, 8) }));
  process.exit(1);
}
console.log("LAND_SMOKE_OK", JSON.stringify(last));

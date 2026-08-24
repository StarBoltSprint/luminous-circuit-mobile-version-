import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForSelector("button", { timeout: 10000 });
await page.waitForTimeout(800);
await page.locator("button").filter({ hasText: /Land|Continue/ }).first().click({ force: true });
await new Promise((r) => setTimeout(r, 2800));
const hud = await page.evaluate(() => document.body.innerText);
const out = {
  errors,
  hasLive: /Live log/i.test(hud),
  hasCharge: /Charge/.test(hud),
  hasVeyra: /Veyra/.test(hud),
  snippet: hud.slice(0, 700),
};
writeFileSync("/tmp/qa-live.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();

// Landing/feed screenshot capture via Playwright (system Chrome, no download).
//
// Usage:
//   npm run dev                         # in another terminal (http://localhost:3000)
//   node scripts/shoot.mjs              # writes PNGs into ../screenshots
//   BASE_URL=http://localhost:3000 node scripts/shoot.mjs
//
// Uses playwright-core + channel:"chrome" so it drives the already-installed
// Google Chrome instead of downloading a browser. The landing page reveals
// sections on scroll (IntersectionObserver), so we auto-scroll the whole page
// to trigger every reveal before taking a full-page screenshot.

import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";

const pages = [
  { name: "landing", path: "/" },
  { name: "feed", path: "/feed" },
];

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

// Scroll the full page in steps so IntersectionObserver reveals fire, then
// return to the top so the full-page capture shows every section visible.
async function triggerReveals(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let y = 0;
        const step = () => {
          y += Math.round(window.innerHeight * 0.85);
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 140);
          else {
            window.scrollTo(0, 0);
            setTimeout(resolve, 450);
          }
        };
        step();
      })
  );
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    for (const p of pages) {
      const url = BASE + p.path;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      } catch (e) {
        console.warn(`! goto ${url}: ${e.message}`);
      }
      // fonts + entrance animations
      try {
        await page.evaluate(() => document.fonts?.ready);
      } catch {}
      await page.waitForTimeout(1600);
      await triggerReveals(page);

      const file = join(OUT, `${p.name}-${vp.label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${file}`);
    }

    await ctx.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

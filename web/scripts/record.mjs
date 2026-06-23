// Screen-record a tour of the deployed app via Playwright (system Chrome, no
// browser download). Loads each route, smooth-scrolls down then back up, and
// saves a single continuous .webm into ../../recordings.
//
// Usage:
//   node scripts/record.mjs
//   BASE_URL=https://giftmaxxing.vercel.app node scripts/record.mjs
//   VIEWPORT=mobile node scripts/record.mjs

import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "recordings");
const BASE = process.env.BASE_URL || "https://giftmaxxing.vercel.app";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const vp = VIEWPORTS[process.env.VIEWPORT || "desktop"] || VIEWPORTS.desktop;

// Routes to visit in order. Missing/slow routes are skipped, not fatal.
const ROUTES = [
  "/feed",
  "/feed/explore",
  "/feed/recommendations",
  "/feed/drops",
  "/feed/pools",
];

// A valid onboarding profile (lib/onboarding STORAGE_KEY + isUserProfile shape).
// Seeded into localStorage so OnboardingGate passes and we land on the feed
// instead of the /onboarding wizard.
const ONBOARDING_KEY = "giftmaxxing_onboarding";
const PROFILE = {
  name: "Alex",
  role: "both",
  difficulty: "moderate",
  style: "mix",
  materialisticCategories: ["tech", "home"],
  interests: ["cozy", "minimalist", "coffee-tea"],
  dealPreferences: {
    sensitivity: "value-conscious",
    budgetRange: "mid",
    dealTypes: ["price-drops", "coupons"],
    priceAlerts: true,
  },
  pinterestLinks: [],
  completedAt: Date.now(),
};

// Smoothly scroll top -> bottom over `down` ms, pause, then bottom -> top.
async function tour(page, { down = 5000, up = 2500 } = {}) {
  await page.evaluate(
    ({ down, up }) =>
      new Promise((resolve) => {
        const max = () =>
          Math.max(0, document.body.scrollHeight - window.innerHeight);
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const run = (from, to, ms) =>
          new Promise((res) => {
            if (Math.abs(to - from) < 4) return res();
            const start = performance.now();
            const frame = (now) => {
              const t = Math.min(1, (now - start) / ms);
              window.scrollTo(0, from + (to - from) * ease(t));
              t < 1 ? requestAnimationFrame(frame) : res();
            };
            requestAnimationFrame(frame);
          });
        (async () => {
          await run(0, max(), down);
          await new Promise((r) => setTimeout(r, 600));
          await run(max(), 0, up);
          await new Promise((r) => setTimeout(r, 400));
          resolve();
        })();
      }),
    { down, up }
  );
}

// Fallback: click through the onboarding wizard if localStorage seeding didn't
// land us on the feed. Picks "Thoughtful" so the materialistic step is skipped.
async function completeOnboarding(page) {
  const btn = (name) => page.getByRole("button", { name });
  await page.getByPlaceholder("Your name").fill("Alex");
  await btn("Continue").click();
  await page.getByText("Both!").click();
  await btn("Continue").click();
  await page.getByText("Moderate", { exact: false }).first().click();
  await btn("Continue").click();
  await page.getByText("Thoughtful", { exact: false }).first().click();
  await btn("Continue").click();
  for (const chip of ["Cozy vibes", "Minimalist", "Coffee & tea"]) {
    await page.getByText(chip).first().click();
  }
  await btn("Next").click();
  await page.getByText("Value-conscious", { exact: false }).first().click();
  await btn("Continue").click();
  await btn("Get started").click();
  await page.waitForURL("**/feed", { timeout: 15000 }).catch(() => {});
}

// Click into the app from the landing page using the first link that works.
async function enterApp(page) {
  const candidates = [
    () => page.getByRole("link", { name: "Open app" }).first(),
    () => page.getByRole("link", { name: /open the live feed/i }).first(),
    () => page.locator('a[href="/feed"]').first(),
  ];
  for (const make of candidates) {
    try {
      await make().click({ timeout: 5000 });
      return true;
    } catch {}
  }
  return false;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: vp,
    recordVideo: { dir: OUT, size: vp },
  });
  // Seed a completed onboarding profile so OnboardingGate lets us into the feed.
  // Values embedded directly (no arg passing) for reliability.
  await ctx.addInitScript(
    `try { localStorage.setItem(${JSON.stringify(ONBOARDING_KEY)}, ${JSON.stringify(
      JSON.stringify(PROFILE)
    )}); } catch (e) {}`
  );
  const page = await ctx.newPage();

  // Enter via the landing page + client-side nav, which avoids OnboardingGate's
  // fresh-load redirect. Seed localStorage first so the gate's first client
  // render already sees a completed profile.
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.evaluate((kv) => {
    try { localStorage.setItem(kv[0], kv[1]); } catch {}
  }, [ONBOARDING_KEY, JSON.stringify(PROFILE)]);
  await page.waitForTimeout(800);
  await enterApp(page);
  await page.waitForURL("**/feed", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Safety net: if somehow still gated, complete the wizard via the UI.
  if (page.url().includes("/onboarding")) {
    console.log("gated -> completing onboarding via UI");
    try { await completeOnboarding(page); } catch (e) { console.warn(`onboarding UI: ${e.message}`); }
  }
  console.log(`entered: ${page.url()}`);

  // Navigate client-side via the sidebar (no page.goto, which would redirect).
  for (let i = 0; i < ROUTES.length; i++) {
    const href = ROUTES[i];
    try {
      if (i > 0) {
        await page.locator(`aside a[href="${href}"]`).first().click();
        await page.waitForURL(`**${href}`, { timeout: 15000 }).catch(() => {});
      }
      try {
        await page.waitForLoadState("networkidle", { timeout: 8000 });
      } catch {}
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      await page.waitForTimeout(1800); // let data/images settle
      console.log(`▶ ${href}  ->  ${page.url()}`);
      await tour(page);
    } catch (e) {
      console.warn(`! ${href}: ${e.message}`);
    }
  }

  const video = page.video();
  await ctx.close(); // finalizes the video file

  if (video) {
    const out = join(OUT, `giftmaxxing-${process.env.VIEWPORT || "desktop"}.webm`);
    await video.saveAs(out); // must run before browser.close()
    await video.delete();
    console.log(`\n✓ Saved recording: ${out}`);
  }
  await browser.close();
  if (!video) {
    console.error("No video was captured.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

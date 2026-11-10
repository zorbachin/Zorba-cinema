#!/usr/bin/env node
// Real Chromium smoke test of the canonical two-property concept engine.
// Requires: npm install --no-save --no-package-lock playwright && npx playwright install chromium
// Tests controls and truth boundaries, NOT production-image approval, sending email or public staging.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.CINEMA_QA_URL || "http://127.0.0.1:8765";
const cases = [
  { id: "17-ocean", start: "arrival", last: "private-viewing", other: "columbus-01" },
  { id: "columbus-01", start: "exterior", last: "private-showing", other: "17-ocean" },
];
const browser = await chromium.launch({ headless: true });
let checked = 0;

async function runOne({ id, start, last, other }, mobileWidth = null) {
  const mobile = mobileWidth !== null;
  const context = await browser.newContext({
    viewport: mobile ? { width: mobileWidth, height: 844 } : { width: 1280, height: 800 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const entry = root + "/prototype/?property=" + id + "#" + start;
  try {
    const response = await page.goto(entry, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200, id + ": document HTTP status");
    await page.locator(".stage").waitFor();
    assert.equal(await page.locator("nav.scene-nav button").count(), 10, id + ": 10 scenes");
    assert.match(await page.locator(".disclosure").innerText(), /CONCEPT PROPERTY.*Not an active real-estate listing/i);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,nofollow");
    assert.equal(new URL(page.url()).hash, "#" + start);

    // Actual button-driven navigation in Chromium, preserving focus after DOM replacement.
    const next = page.locator('[data-action="next"]');
    await next.focus();
    await page.keyboard.press("Enter");
    assert.notEqual(new URL(page.url()).hash, "#" + start, "next button changed scene");
    assert.equal(await page.locator('[data-action="next"]').evaluate((el) => document.activeElement === el),
      true, "next button retains focus after scene render");

    // Shared links can be mistyped or corrupted. A malformed percent escape
    // previously crashed scene parsing and left a cold visitor with no page.
    for (const fragment of ["#%E0%A4%A", "#unknown-scene"]) {
      await page.goto(root + "/prototype/?property=" + id + fragment, { waitUntil: "domcontentloaded" });
      await page.locator(".stage").waitFor();
      assert.equal(new URL(page.url()).hash, "#" + start,
        id + ": invalid deep link recovers to the first scene");
    }

    // Direct hashed links are independently loadable without authentication.
    await page.goto(root + "/prototype/?property=" + id + "#" + last, { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="explain"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#" + last);
    assert.match(await page.locator(".disclosure").innerText(), /Not an active real-estate listing/i);
    await page.locator('[data-action="explain"]').click();
    assert.equal(await page.locator("#explain").evaluate((el) => el.open), true, "dialog opens");
    const contact = page.locator("#explain a.contact-action");
    assert.equal(await contact.count(), 1, "one service-only enquiry CTA");
    assert.equal(await contact.getAttribute("href"),
      "mailto:zgrashin@gmail.com?subject=Cinematic%20Listings%20demo%20inquiry");
    assert.match(await page.locator("#explain").innerText(), /demo inquiry goes to Zorba, not a real-estate agent/i);
    const modalHash = new URL(page.url()).hash;
    await page.keyboard.press("ArrowLeft");
    assert.equal(new URL(page.url()).hash, modalHash, "modal blocks background scene arrow");
    await page.locator('#explain [data-action="close"]').click();
    assert.equal(await page.locator("#explain").evaluate((el) => el.open), false, "dialog closes");

    // Property switch uses the same engine, and cannot accidentally retain the old hash.
    await page.locator('[data-property="' + other + '"]').click();
    assert.equal(new URL(page.url()).searchParams.get("property"), other, "switch updates query");
    assert.notEqual(new URL(page.url()).hash, "#" + last, "switch returns to first scene");
    assert.equal(await page.locator('[data-property="' + other + '"]').getAttribute("aria-pressed"), "true");

    if (mobile) {
      const nav = page.locator(".scene-nav");
      assert.equal(await nav.evaluate((el) => getComputedStyle(el).overflowX), "auto",
        "mobile scene index is scrollable");
      const box = await page.locator(".scene-nav button").first().boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, "mobile scene control >=44px");
      const controls = await page.locator('[data-action="next"]').boundingBox();
      assert.ok(controls && controls.height >= 44, "mobile next target >=44px");
    }
    assert.deepEqual(errors, [], "no uncaught browser JavaScript errors");
    checked++;
    console.log("PASS Chromium " + id + " / " + (mobile ? mobileWidth + "px touch" : "1280px desktop") +
      ": deep link, 10 scenes, navigation/focus, disclosure, dialog, service CTA, switch" +
      (mobile ? ", tap sizing" : ""));
  } finally {
    await context.close();
  }
}

try {
  for (const item of cases) {
    await runOne(item);
    for (const width of [390, 430]) await runOne(item, width);
  }
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto(root + "/prototype/?property=17-ocean#arrival", { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(".shell.reduced").count(), 1, "reduced-motion class applied");
    checked++;
    console.log("PASS Chromium reduced-motion preference");
  } finally {
    await context.close();
  }
  console.log("CHROMIUM ENGINE QA: PASS (" + checked + " actual browser scenarios).");
  console.log("RELEASE HOLD: media continuity, mail delivery, actual public staging and human approval are NOT tested.");
} finally {
  await browser.close();
}

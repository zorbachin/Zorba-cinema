#!/usr/bin/env node
// Zero-dependency regression test for the existing prototype's media fallback.
// Run from repository root: node scripts/test-media-fallback.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const appFile = path.resolve(dir, "../prototype/app.js");
const source = fs.readFileSync(appFile, "utf8");
new vm.Script(source, { filename: "prototype/app.js" });
const fallbackCode = source.match(/  function installMediaFallback\(\) \{[\s\S]*?\n  \}\n/)?.[0];
assert.ok(fallbackCode, "expected existing installMediaFallback function");

function simulate(failures, imagePresent = true) {
  let src = "../properties/17-ocean/media/01-arrival-coast.webp";
  let errorListener = null;
  let removed = 0;
  let pendingInserted = 0;
  const image = {
    getAttribute: (name) => name === "src" ? src : null,
    get src() { return src; },
    set src(next) { src = next; },
    addEventListener(type, callback) { if (type === "error") errorListener = callback; },
    parentElement: { insertAdjacentHTML(where, html) {
      assert.equal(where, "afterbegin");
      assert.match(html, /pending/);
      pendingInserted++;
    } },
    remove() { removed++; }
  };
  vm.runInNewContext(fallbackCode + "\ninstallMediaFallback();", {
    app: { querySelector: () => imagePresent ? image : null },
    pendingMedia: () => "<pending />"
  }, { filename: "test:extracted-installMediaFallback" });
  const tried = [src];
  for (let i = 0; i < failures; i++) {
    assert.equal(typeof errorListener, "function", "must bind media error listener");
    errorListener();
    tried.push(src);
  }
  return { tried, src, removed, pendingInserted, hasErrorListener: !!errorListener };
}

const unchanged = simulate(0);
assert.equal(unchanged.src.endsWith(".webp"), true);
assert.equal(unchanged.pendingInserted, 0);

const variants = simulate(4);
assert.deepEqual(variants.tried.map(x => path.extname(x)), [".webp", ".jpg", ".jpeg", ".png", ".avif"]);
assert.equal(variants.pendingInserted, 0, "pending must not hide a valid final AVIF");
assert.equal(variants.removed, 0);

const exhausted = simulate(5);
assert.equal(exhausted.removed, 1, "remove the broken image only after all formats fail");
assert.equal(exhausted.pendingInserted, 1, "show pending only after all formats fail");

const absent = simulate(0, false);
assert.equal(absent.hasErrorListener, false, "no-op for scenes without an image");

console.log("PASS: prototype/app.js parses");
console.log("PASS: valid first WebP remains unchanged");
console.log("PASS: sequential WebP/JPEG/PNG/AVIF fallback follows manifest-supported extensions");
console.log("PASS: no premature PENDING; fails closed after every candidate fails");
console.log("PASS: no image makes no binding");

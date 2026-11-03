#!/usr/bin/env node
// Offline smoke test of the existing Cinematic Listings concept-service inquiry.
// This does not send email, certify email-client delivery, or replace device QA.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = fs.readFileSync(path.join(root, "prototype/data.js"), "utf8");
const script = fs.readFileSync(path.join(root, "prototype/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "prototype/styles.css"), "utf8");
new vm.Script(script, { filename: "prototype/app.js" });
new vm.Script(data, { filename: "prototype/data.js" });
assert.match(css, /dialog \.contact-action:focus-visible/);

for (const [propertyId, finalHash] of [
  ["17-ocean", "#private-viewing"],
  ["columbus-01", "#private-showing"]
]) {
  let markup = "";
  const listeners = new Map();
  const url = new URL("https://preview.example/prototype/?property=" + propertyId + "#arrival");
  const location = { href: url.href, hash: propertyId === "17-ocean" ? "#arrival" : "#exterior" };
  const app = {
    contains: () => false,
    get innerHTML() { return markup; },
    set innerHTML(value) { markup = value; },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const window = { matchMedia: () => ({ matches: false, addEventListener() {} }), location };
  const sandbox = {
    window, location, URL, Date,
    document: { getElementById: (id) => id === "app" ? app : null, activeElement: null },
    history: { replaceState(_state, _title, next) { location.href = next.href; } },
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  vm.runInNewContext(data, sandbox, { filename: "prototype/data.js" });
  vm.runInNewContext(script, sandbox, { filename: "prototype/app.js" });
  assert.doesNotMatch(markup, /data-action="explain"/, "before final scene no explanation CTA");
  location.hash = finalHash;
  listeners.get("hashchange")();
  assert.match(markup, /data-action="explain"/, "final scene provides explanation CTA");
  assert.match(markup, /CONCEPT ONLY/);
  assert.match(markup, /Not an active real-estate listing/);
  assert.match(markup, /mailto:zgrashin@gmail\.com\?subject=Cinematic%20Listings%20demo%20inquiry/);
  assert.match(markup, /aria-label="Email Zorba about the Cinematic Listings demo"/);
  assert.match(markup, /The demo inquiry goes to Zorba, not a real-estate agent/);
  assert.match(markup, /does not send or store messages/);
  assert.match(markup, /contact-email">zgrashin@gmail\.com/);
  assert.doesNotMatch(markup, /No live contact action is wired/);
  assert.equal((markup.match(/class="contact-action"/g) || []).length, 1);
  console.log("PASS:", propertyId, "final-scene concept inquiry, URL and no-send boundary");
}
console.log("PASS: existing two-property engine unchanged; one manual email route, accessible styling");

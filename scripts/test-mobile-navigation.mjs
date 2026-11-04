#!/usr/bin/env node
// Regression: mobile scene-strip scrolling must not trigger scene navigation.
// Tests committed handler logic without a browser. Real-device QA still required.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "prototype/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "prototype/styles.css"), "utf8");
new vm.Script(source, { filename: "prototype/app.js" });

const from = source.indexOf('  addEventListener("wheel"');
const to = source.indexOf('  addEventListener("hashchange"', from);
assert.ok(from >= 0 && to > from, "expected canonical wheel/touch handlers");
const listeners = new Map();
let transitions = 0;
let defaultPrevented = 0;
let dialogOpen = false;
const context = {
  app: { querySelector: () => ({ open: dialogOpen }) },
  addEventListener: (name, fn) => listeners.set(name, fn),
  go: (delta) => { transitions += delta; },
  Date
};
vm.runInNewContext("let touchStart = null; let lastWheel = 0;\n" + source.slice(from, to), context);
for (const event of ["wheel", "touchstart", "touchend", "touchcancel"]) {
  assert.equal(typeof listeners.get(event), "function", event + " handler installed");
}
const target = (kind) => ({
  closest: (selector) => kind === "nav" && selector.includes(".scene-nav")
    || kind === "button" && selector.includes("button")
    || kind === "dialog" && selector.includes("dialog") ? {} : null
});
function touch(kind, startX = 240, endX = 40) {
  listeners.get("touchstart")({
    target: target(kind), changedTouches: [{ clientX: startX, clientY: 180 }]
  });
  listeners.get("touchend")({
    target: target(kind), changedTouches: [{ clientX: endX, clientY: 180 }]
  });
}
touch("nav");
assert.equal(transitions, 0, "dragging scene-strip must not change scenes");
touch("button");
assert.equal(transitions, 0, "pressing navigation controls must not trigger a swipe");
touch("stage");
assert.equal(transitions, 1, "swiping the stage still changes scenes");
listeners.get("touchstart")({ target: target("stage"), changedTouches: [{ clientX: 240, clientY: 180 }] });
listeners.get("touchcancel")();
listeners.get("touchend")({ target: target("stage"), changedTouches: [{ clientX: 40, clientY: 180 }] });
assert.equal(transitions, 1, "canceled gesture must not change scenes");
dialogOpen = true;
touch("stage");
dialogOpen = false;
assert.equal(transitions, 1, "open dialog blocks background swipe");
function wheel(kind) {
  listeners.get("wheel")({
    target: target(kind), deltaY: 120,
    preventDefault: () => { defaultPrevented++; }
  });
}
wheel("nav");
assert.equal(transitions, 1, "wheel over the scrollable scene index remains native");
wheel("stage");
assert.equal(transitions, 2, "wheel over the stage still changes scenes");
assert.equal(defaultPrevented, 1, "only stage scene navigation prevents wheel defaults");
assert.match(css, /\.scene-nav button\{width:44px;height:44px;min-width:44px;min-height:44px/);
assert.match(css, /overflow-x:auto;overflow-y:hidden/);
assert.match(css, /\.property-switch button,\.controls button,\.concept-cta,dialog button,dialog \.contact-action\{min-height:44px\}/);
console.log("PASS: scene-index touch/wheel scrolling, stage gestures, cancellation and dialog lock");
console.log("PASS: 44px mobile scene targets and horizontally scrollable index");

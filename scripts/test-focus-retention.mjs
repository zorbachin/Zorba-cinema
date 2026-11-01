#!/usr/bin/env node
// Zero-dependency regression for preserving keyboard focus after scene rerenders.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "../prototype/app.js"), "utf8");
new vm.Script(source, { filename: "prototype/app.js" });
const helpers = ["captureNavigationFocus", "restoreNavigationFocus"].map((name) => {
  const found = source.match(new RegExp("  function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}"))?.[0];
  assert.ok(found, "missing " + name);
  return found;
}).join("\n");
assert.match(source, /const focusAnchor = captureNavigationFocus\(\)/);
assert.match(source, /restoreNavigationFocus\(focusAnchor\)/);

function simulate(kind, value, { disabled = false, external = false, missing = false } = {}) {
  let focus = null;
  const old = {
    dataset: kind === "stage" ? {} : { [kind]: value },
    classList: { contains: (name) => name === "stage" && kind === "stage" }
  };
  const next = {
    dataset: old.dataset,
    disabled,
    focus: (options) => {
      assert.equal(options.preventScroll, true);
      focus = "matching control";
    }
  };
  const stage = {
    focus: (options) => {
      assert.equal(options.preventScroll, true);
      focus = "stage";
    }
  };
  const app = {
    contains: (node) => node === old && !external,
    querySelector: (selector) => selector === ".stage" ? stage : null,
    querySelectorAll: (selector) =>
      selector === "[data-" + kind + "]" && !missing ? [next] : []
  };
  const document = { activeElement: kind === "none" ? null : old };
  const api = new vm.Script("(() => {\n" + helpers + "\nreturn { captureNavigationFocus, restoreNavigationFocus };\n})()")
    .runInNewContext({ app, document });
  const snapshot = api.captureNavigationFocus();
  api.restoreNavigationFocus(snapshot);
  return focus;
}

assert.equal(simulate("action", "next"), "matching control");
assert.equal(simulate("action", "prev", { disabled: true }), "stage");
assert.equal(simulate("scene", "4"), "matching control");
assert.equal(simulate("property", "columbus-01"), "matching control");
assert.equal(simulate("scene", "4", { missing: true }), "stage");
assert.equal(simulate("stage"), "stage");
assert.equal(simulate("action", "next", { external: true }), null);
assert.equal(simulate("none"), null);
assert.equal(simulate("action", "close"), null, "dialog controls are not retargeted");
console.log("PASS: app syntax and focus capture/restore wiring");
console.log("PASS: next/prev, scene, property and stage keyboard focus");
console.log("PASS: disabled/missing controls fall back safely to stage");
console.log("PASS: focus outside app, no focus and dialog control are not stolen");

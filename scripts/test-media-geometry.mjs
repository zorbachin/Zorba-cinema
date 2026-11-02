#!/usr/bin/env node
// Zero-dependency regression for final concept-image size/crop gates.
// Does not substitute for visual continuity approval or a real browser pass.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "validate-media.mjs"), "utf8");
const parsedSource = source
  .replace(/^#![^\n]*\n/, "")
  .replace(/^import .*;\n/gm, "")
  .replace(/import\.meta\.url/g, '"file:///repo/scripts/validate-media.mjs"');
new vm.Script(parsedSource, { filename: "validate-media.mjs" });
const helper = source.match(/^function verifyImageGeometry\([\s\S]*?^\}/m)?.[0];
assert.ok(helper, "verifyImageGeometry helper must exist in canonical validator");
assert.match(source, /else\s*\{\s*const geometryIssue = verifyImageGeometry\(filename, base === manifest\.requiredCrop\.basename\)/);
assert.match(source, /&& unsuitable\.length === 0/);

function probe({ width, height } = {}, isHero = false, simulatedResult = null) {
  let requested = false;
  const spawnSync = (binary, args) => {
    assert.equal(binary, "ffprobe");
    assert.ok(args.includes("stream=width,height"));
    requested = true;
    return simulatedResult || { status: 0, stdout: JSON.stringify({ streams: [{ width, height }] }) };
  };
  const getVerifier = new vm.Script("(() => {\n" + helper + "\nreturn verifyImageGeometry;\n})()");
  const verify = getVerifier.runInNewContext({ spawnSync });
  const outcome = verify("scene.png", isHero);
  assert.equal(requested, true);
  return outcome;
}

const cases = [
  ["16:9 scene master", { width: 3200, height: 1800 }, false, null],
  ["minimum 16:9 master", { width: 2560, height: 1440 }, false, null],
  ["4:5 hero master", { width: 2048, height: 2560 }, true, null],
  ["small storyboard panel", { width: 508, height: 308 }, false, "at least 2560"],
  ["undersized hero", { width: 1900, height: 2500 }, true, "at least 2560"],
  ["4:3 scene", { width: 3200, height: 2400 }, false, "16:9"],
  ["landscape hero", { width: 3200, height: 1800 }, true, "4:5"],
  ["portrait scene", { width: 3200, height: 4000 }, false, "16:9"],
  ["incorrect portrait hero crop", { width: 2560, height: 2000 }, true, "4:5"]
];
for (const [name, dimensions, hero, expected] of cases) {
  const got = probe(dimensions, hero);
  if (expected === null) assert.equal(got, null, name);
  else assert.match(got, new RegExp(expected), name);
}

for (const [name, result] of [
  ["ffprobe missing", { error: new Error("ENOENT") }],
  ["ffprobe process failure", { status: 1, stderr: "probe failed" }],
  ["malformed JSON", { status: 0, stdout: "{invalid" }],
  ["no geometry", { status: 0, stdout: '{"streams":[{}]}' }]
]) {
  assert.ok(probe({}, false, result), name + " must not pass");
}
console.log("PASS: canonical validator compiles and geometry gate is wired to required slots");
console.log("PASS: 13 size, aspect ratio, missing decoder and corrupt-probe scenarios");

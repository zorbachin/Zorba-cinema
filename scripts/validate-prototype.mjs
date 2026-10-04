#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sandbox = { window: {} };

const dataSource = fs.readFileSync(path.join(root, "prototype/data.js"), "utf8");
vm.runInNewContext(dataSource, sandbox, { filename: "prototype/data.js" });
const catalog = sandbox.window.CINEMATIC_LISTINGS;

const manifestFiles = {
  "17-ocean": "properties/17-ocean/MEDIA-MANIFEST.json",
  "columbus-01": "properties/columbus-01/MEDIA-MANIFEST.json",
};

let failures = 0;
function fail(message) {
  failures += 1;
  console.error("FAIL: " + message);
}
function pass(message) {
  console.log("PASS: " + message);
}

for (const [propertyId, manifestRel] of Object.entries(manifestFiles)) {
  const item = catalog?.[propertyId];
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), "utf8"));

  if (!item) {
    fail(propertyId + " missing from prototype/data.js");
    continue;
  }

  if (item.status !== "concept") fail(propertyId + " status must remain concept");
  else pass(propertyId + " remains explicitly concept");

  if (!/CONCEPT PROPERTY/i.test(item.disclosure || "") || !/not an active real-estate listing/i.test(item.disclosure || "")) {
    fail(propertyId + " disclosure is missing the concept/not-active boundary");
  } else {
    pass(propertyId + " disclosure is explicit");
  }

  if (item.scenes.length !== manifest.requiredFrames.length) {
    fail(propertyId + " scene count " + item.scenes.length + " does not match manifest count " + manifest.requiredFrames.length);
  } else {
    pass(propertyId + " exposes all " + item.scenes.length + " canonical scenes");
  }

  item.scenes.forEach((scene, index) => {
    const expected = manifest.requiredFrames[index];
    const actual = scene.image ? path.basename(scene.image, path.extname(scene.image)) : null;
    if (actual !== expected) {
      fail(propertyId + " scene " + (index + 1) + " expected media basename " + expected + " but got " + String(actual));
    }
  });

  if (item.scenes.every((scene, index) => path.basename(scene.image || "", path.extname(scene.image || "")) === manifest.requiredFrames[index])) {
    pass(propertyId + " scene order matches MEDIA-MANIFEST.json");
  }

  if (!item.scenes.at(-1)?.final) fail(propertyId + " final scene is not marked final");
  else pass(propertyId + " final scene is the only commercial explanation gate");
}

const serialized = JSON.stringify(catalog);
const forbidden = [
  /\bMLS\b/i,
  /\bZillow\b/i,
  /\btestimonial\b/i,
  /\bsold for\b/i,
  /\bsquare feet\b/i,
  /\bsq\.?\s*ft\.?\b/i,
  /\bminutes? to\b/i,
  /\bschool district\b/i,
  /\$\s*\d/,
];
for (const pattern of forbidden) {
  if (pattern.test(serialized)) fail("prototype data contains forbidden claim pattern: " + pattern);
}
if (!forbidden.some((pattern) => pattern.test(serialized))) {
  pass("prototype data contains no listing metrics, fake price, MLS/Zillow, commute, school-district or testimonial claims");
}

const html = fs.readFileSync(path.join(root, "prototype/index.html"), "utf8");
if (!/<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']/i.test(html)) {
  fail("prototype/index.html must remain noindex,nofollow");
} else {
  pass("review prototype remains noindex,nofollow");
}

if (failures) {
  console.error("\nPROTOTYPE GATE: FAIL — " + failures + " issue(s).");
  process.exitCode = 1;
} else {
  console.log("\nPROTOTYPE GATE: PASS — data, truth boundary and media-slot wiring are coherent.");
}

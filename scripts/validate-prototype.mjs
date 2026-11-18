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

  // Static property metadata must agree with buyer-visible concept content.
  // Otherwise unsupported locations can return without breaking the browser tests.
  const propertySource = fs.readFileSync(path.join(root, "properties", propertyId, "property.ts"), "utf8");
  for (const field of ["id", "status", "label", "location"]) {
    const pattern = new RegExp(`^\\s*${field}:\\s*"([^"]+)"\\s*,?\\s*$`, "m");
    const found = propertySource.match(pattern);
    if (!found) fail(propertyId + " property.ts must expose literal " + field + " metadata");
    else if (found[1] !== item[field]) fail(propertyId + " " + field + " mismatch: property.ts=" + JSON.stringify(found[1]) + " browser=" + JSON.stringify(item[field]));
    else pass(propertyId + " " + field + " metadata agrees with prototype");
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

  // The media basename alone is insufficient: an external URL or a sibling
  // property's path with the same filename would pass the old check, allowing
  // tracking requests or broken renders despite a green source-truth gate.
  // Keep the known local .webp route; app.js may fall back to other approved
  // encodings *within this directory* after an image load error.
  item.scenes.forEach((scene, index) => {
    const base = manifest.requiredFrames[index];
    const expected = "../properties/" + propertyId + "/media/" + base + ".webp";
    if (scene.image !== expected) {
      fail(propertyId + " scene " + (index + 1) + " must use canonical local media path " +
        JSON.stringify(expected) + ", not " + JSON.stringify(scene.image));
    }
  });

  if (item.scenes.every((scene, index) =>
    scene.image === "../properties/" + propertyId + "/media/" + manifest.requiredFrames[index] + ".webp")) {
    pass(propertyId + " scene order and local media paths match MEDIA-MANIFEST.json");
  }

  const finalSceneIndices = item.scenes.flatMap((scene, index) => scene.final ? [index] : []);
  if (finalSceneIndices.length !== 1 || finalSceneIndices[0] !== item.scenes.length - 1) {
    fail(propertyId + " must mark exactly the last scene as final");
  } else {
    pass(propertyId + " final scene is the only commercial explanation gate");
  }
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

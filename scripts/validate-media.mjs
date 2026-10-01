#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const manifestPaths = [
  "properties/17-ocean/MEDIA-MANIFEST.json",
  "properties/columbus-01/MEDIA-MANIFEST.json",
];

let failures = 0;

function filesByBasename(dir, extensions) {
  if (!fs.existsSync(dir)) return new Map();
  const map = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!extensions.includes(ext)) continue;
    const base = path.basename(entry.name, ext);
    const list = map.get(base) || [];
    list.push(entry.name);
    map.set(base, list);
  }
  return map;
}

for (const relManifest of manifestPaths) {
  const manifestFile = path.join(repoRoot, relManifest);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const mediaDir = path.join(repoRoot, manifest.mediaDirectory);
  const byBase = filesByBasename(mediaDir, manifest.allowedExtensions);

  const expected = [...manifest.requiredFrames, manifest.requiredCrop.basename];
  const missing = [];
  const ambiguous = [];

  for (const base of expected) {
    const matches = byBase.get(base) || [];
    if (matches.length === 0) missing.push(base);
    if (matches.length > 1) ambiguous.push({ base, matches });
  }

  const unexpected = [...byBase.entries()]
    .filter(([base]) => !expected.includes(base))
    .flatMap(([, names]) => names)
    .sort();

  const pass = missing.length === 0 && ambiguous.length === 0;
  if (!pass) failures += 1;

  console.log("\n[" + manifest.propertyId + "] " + (pass ? "PASS" : "NOT READY"));
  console.log("media: " + path.relative(repoRoot, mediaDir));

  if (missing.length) {
    console.log("missing:");
    for (const base of missing) console.log("  - " + base);
  }

  if (ambiguous.length) {
    console.log("ambiguous basenames (keep exactly one file per required slot):");
    for (const item of ambiguous) {
      console.log("  - " + item.base + ": " + item.matches.join(", "));
    }
  }

  if (unexpected.length) {
    console.log("extra files (allowed, but not counted toward readiness):");
    for (const name of unexpected) console.log("  - " + name);
  }

  if (pass) {
    console.log("all 10 required scene frames + hero-4x5 are present");
  }
}

if (failures) {
  console.error("\nMEDIA GATE: FAIL — " + failures + " property pack(s) incomplete or ambiguous.");
  process.exitCode = 1;
} else {
  console.log("\nMEDIA GATE: PASS — both continuity packs have all required slots.");
}

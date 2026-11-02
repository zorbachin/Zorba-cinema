#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
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

function verifyImageDecode(filename) {
  // Decode the first frame, not merely the filename, signature or file size.
  // Fail closed when FFmpeg is unavailable; final continuity requires visual review.
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-xerror", "-i", filename,
    "-frames:v", "1", "-f", "null", "-"
  ], { encoding: "utf8", timeout: 30000, maxBuffer: 1_000_000 });
  if (result.error) return "decoder unavailable or failed: " + result.error.message;
  if (result.status !== 0) return "cannot decode first image frame: " + (result.stderr || `exit ${result.status}`).trim().slice(0, 180);
  return null;
}

function verifyImageGeometry(filename, isHero) {
  // Reject low-resolution storyboard panels and wrongly cropped concept assets.
  const result = spawnSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "json", filename
  ], { encoding: "utf8", timeout: 30000, maxBuffer: 1_000_000 });
  if (result.error) return "dimension probe unavailable: " + result.error.message;
  if (result.status !== 0) return "cannot inspect dimensions: " + (result.stderr || `exit ${result.status}`).trim().slice(0, 180);
  let width, height;
  try {
    const stream = JSON.parse(result.stdout).streams?.[0];
    width = stream?.width;
    height = stream?.height;
  } catch {
    return "invalid dimension probe response";
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return "missing or invalid image dimensions";
  }
  if (Math.max(width, height) < 2560) {
    return `image is ${width}x${height}; concept production master must be at least 2560px on its long edge`;
  }
  const ratio = width / height;
  if (isHero && (width >= height || Math.abs(ratio - 0.8) > 0.03)) {
    return `hero is ${width}x${height}; required hero-4x5 must be portrait 4:5`;
  }
  if (!isHero && ratio < (16 / 9) - 0.02) {
    return `scene is ${width}x${height}; concept scene master must be landscape 16:9 or wider`;
  }
  return null;
}

for (const relManifest of manifestPaths) {
  const manifestFile = path.join(repoRoot, relManifest);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const mediaDir = path.join(repoRoot, manifest.mediaDirectory);
  const byBase = filesByBasename(mediaDir, manifest.allowedExtensions);

  const expected = [...manifest.requiredFrames, manifest.requiredCrop.basename];
  const missing = [];
  const ambiguous = [];
  const zeroByte = [];
  const undecodable = [];
  const unsuitable = [];

  for (const base of expected) {
    const matches = byBase.get(base) || [];
    if (matches.length === 0) missing.push(base);
    if (matches.length > 1) ambiguous.push({ base, matches });
    if (matches.length === 1) {
      const filename = path.join(mediaDir, matches[0]);
      if (fs.statSync(filename).size === 0) zeroByte.push(matches[0]);
      else {
        const reason = verifyImageDecode(filename);
        if (reason) undecodable.push({ name: matches[0], reason });
        else {
          const geometryIssue = verifyImageGeometry(filename, base === manifest.requiredCrop.basename);
          if (geometryIssue) unsuitable.push({ name: matches[0], reason: geometryIssue });
        }
      }
    }
  }

  const unexpected = [...byBase.entries()]
    .filter(([base]) => !expected.includes(base))
    .flatMap(([, names]) => names)
    .sort();

  const pass = missing.length === 0 && ambiguous.length === 0 && zeroByte.length === 0 && undecodable.length === 0 && unsuitable.length === 0;
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

  if (zeroByte.length) {
    console.log("empty image files (must contain actual media):");
    for (const name of zeroByte) console.log("  - " + name);
  }

  if (undecodable.length) {
    console.log("unreadable image files (first frame must decode with FFmpeg):");
    for (const item of undecodable) console.log("  - " + item.name + ": " + item.reason);
  }

  if (unsuitable.length) {
    console.log("wrong-size or wrong-aspect production images:");
    for (const item of unsuitable) console.log("  - " + item.name + ": " + item.reason);
  }

  if (unexpected.length) {
    console.log("extra files (allowed, but not counted toward readiness):");
    for (const name of unexpected) console.log("  - " + name);
  }

  if (pass) {
    console.log("all 10 required scene frames + hero-4x5 decode (continuity and approvals still require visual QA)");
  }
}

if (failures) {
  console.error("\nMEDIA GATE: FAIL — " + failures + " property pack(s) incomplete, ambiguous or unreadable.");
  process.exitCode = 1;
} else {
  console.log("\nMEDIA GATE: PASS — both required media packs decode; continuity approval is separate.");
}

#!/usr/bin/env node
// Prove the offerability truth gate rejects external/sibling media sources even
// when the filename matches a required manifest slot. No generated media needed.
// This is source-routing QA, not rights clearance or production-image approval.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "scripts/validate-prototype.mjs",
  "prototype/data.js",
  "prototype/index.html",
  "properties/17-ocean/property.ts",
  "properties/17-ocean/MEDIA-MANIFEST.json",
  "properties/columbus-01/property.ts",
  "properties/columbus-01/MEDIA-MANIFEST.json"
];
const canonical = '../properties/17-ocean/media/01-arrival-coast.webp';
const alternatePaths = [
  ["remote tracking host", "https://tracking.invalid/01-arrival-coast.webp"],
  ["protocol-relative remote host", "//tracking.invalid/01-arrival-coast.webp"],
  ["sibling directory", "../properties/17-ocean/reference/01-arrival-coast.webp"],
  ["other property's media folder", "../properties/columbus-01/media/01-arrival-coast.webp"],
  ["query-string media URL", canonical + "?v=unreviewed"]
];

function validate(tempRoot) {
  return spawnSync(process.execPath, [path.join(tempRoot, "scripts/validate-prototype.mjs")], {
    encoding: "utf8",
    timeout: 15000
  });
}

test("canonical scene sources pass while same-basename unapproved destinations fail closed", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cinema-source-path-"));
  try {
    for (const rel of requiredFiles) {
      const destination = path.join(tempRoot, rel);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, rel), destination);
    }
    const dataFile = path.join(tempRoot, "prototype/data.js");
    const original = fs.readFileSync(dataFile, "utf8");
    const needle = 'image: "' + canonical + '"';
    assert.equal(original.split(needle).length - 1, 1, "fixture targets exactly one known scene");

    const baseline = validate(tempRoot);
    assert.equal(baseline.status, 0, baseline.stderr || baseline.error?.message);
    assert.match(baseline.stdout, /local media paths match MEDIA-MANIFEST\.json/);

    for (const [name, pathValue] of alternatePaths) {
      fs.writeFileSync(dataFile, original.replace(needle, 'image: "' + pathValue + '"'));
      const result = validate(tempRoot);
      assert.equal(result.error, undefined, name + ": validator must execute");
      assert.equal(result.status, 1, name + ": must fail the source gate");
      assert.match(result.stderr, /must use canonical local media path/, name);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

#!/usr/bin/env node
// Verify the static app shell points at real local assets and modules.
// This catches broken script/style paths before GitHub Pages or a local server does.

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const appFiles = new Set(["index.html"]);
const missing = [];

function localAssetRefs(html) {
  const refs = [];
  const patterns = [
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const ref = match[1];
      if (!ref.startsWith("data:") && !/^https?:\/\//i.test(ref)) refs.push(ref);
    }
  }
  return refs;
}

async function exists(relativePath, source) {
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    missing.push(`${source} references unsafe path: ${relativePath}`);
    return;
  }

  try {
    await access(path.join(root, normalized));
    appFiles.add(normalized);
  } catch {
    missing.push(`${source} references missing file: ${relativePath}`);
  }
}

async function importedModules(relativePath) {
  const filePath = path.join(root, relativePath);
  const source = await readFile(filePath, "utf8");
  const imports = [...source.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)].map((m) => m[1]);
  await Promise.all(imports.map((ref) => exists(path.join(path.dirname(relativePath), ref), relativePath)));
}

const html = await readFile(indexPath, "utf8");
await Promise.all(localAssetRefs(html).map((ref) => exists(ref, "index.html")));

const checkedModules = new Set();
while (true) {
  const nextModule = [...appFiles].find((file) => file.endsWith(".js") && !checkedModules.has(file));
  if (!nextModule) break;
  checkedModules.add(nextModule);
  await importedModules(nextModule);
}

if (missing.length) {
  console.error("Static asset verification failed:");
  for (const line of missing) console.error(`- ${line}`);
  process.exit(1);
}

console.log(`Static asset verification passed for ${appFiles.size} files.`);

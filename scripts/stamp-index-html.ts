#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Adds content hashes and the hero preload to the built index.html.
// Crawlers do not run JavaScript, so the static tags must already be final.
// Usage: bun run scripts/stamp-index-html.ts

import { readFile, writeFile } from 'node:fs/promises';
import { stampIndexHtml } from '../src/app/core/images/image-delivery';

const MANIFEST_PATH = 'src/app/core/images/image-manifest.generated.json';
const INDEX_PATH = 'dist/dogitect/browser/index.html';

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

async function main(): Promise<void> {
  const manifestText = await readFile(MANIFEST_PATH, 'utf8');
  const parsed: unknown = JSON.parse(manifestText);
  if (!isStringRecord(parsed)) {
    throw new Error(`${MANIFEST_PATH} must be a string map`);
  }

  const html = await readFile(INDEX_PATH, 'utf8');
  await writeFile(INDEX_PATH, stampIndexHtml(html, parsed));
  console.log(`Stamped ${INDEX_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

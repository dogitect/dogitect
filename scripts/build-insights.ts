#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Compiles content/insights into one cases.json the site and the worker both read.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readInsightSource } from './insights-source';

const OUTPUT_DIR = 'public/content/insights';

async function main(): Promise<void> {
  const source = await readInsightSource();
  if (source.errors.length > 0 || source.projects === null) {
    for (const message of source.errors) {
      console.error(message);
    }
    process.exit(1);
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    join(OUTPUT_DIR, 'cases.json'),
    `${JSON.stringify(source.cases, null, 2)}\n`
  );
  console.log(`Wrote ${source.cases.length} insight case(s).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

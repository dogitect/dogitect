#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Replaces Git LFS pointers under public/images and public/documents with the
// original bytes from the assets host. A checkout without those blobs otherwise
// serves the pointer text, so local images do not decode. Files that are
// already real assets are left untouched. Deployed builds still request
// Cloudflare Image transformations; this only fills the local files.
// Usage: bun run assets:hydrate

import { createHash } from 'node:crypto';
import {
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { ASSETS_ORIGIN } from '../src/app/core/images/image-delivery';

const ROOTS = [
  { dir: 'public/images', extensions: ['.png', '.jpg'] },
  { dir: 'public/documents', extensions: ['.pdf'] },
] as const;

/** Pointers are about 130 bytes. Real assets are larger than this. */
const MAX_POINTER_BYTES = 512;

const LFS_POINTER =
  /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([a-f0-9]{64})\nsize (\d+)\n?$/;

export interface LfsPointer {
  readonly oid: string;
  readonly size: number;
}

export function parseLfsPointer(text: string): LfsPointer | null {
  const match = LFS_POINTER.exec(text);
  const oid = match?.[1];
  const sizeText = match?.[2];
  if (oid === undefined || sizeText === undefined) {
    return null;
  }
  const size = Number(sizeText);
  if (!Number.isSafeInteger(size) || size < 0) {
    return null;
  }
  return { oid, size };
}

interface PointerFile {
  readonly file: string;
  readonly key: string;
  readonly pointer: LfsPointer;
}

async function collectFiles(
  dir: string,
  extensions: readonly string[]
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path, extensions)));
    } else if (
      entry.isFile() &&
      extensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(path);
    }
  }
  return files;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function readPointer(file: string): Promise<LfsPointer | null> {
  const info = await stat(file);
  if (!info.isFile() || info.size > MAX_POINTER_BYTES) {
    return null;
  }
  return parseLfsPointer(await readFile(file, 'utf8'));
}

async function download(key: string, pointer: LfsPointer): Promise<Uint8Array> {
  const response = await fetch(`${ASSETS_ORIGIN}/${key}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${key}: ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== pointer.size) {
    throw new Error(
      `Refusing ${key}: expected ${pointer.size} bytes, received ${bytes.byteLength}`
    );
  }
  const oid = createHash('sha256').update(bytes).digest('hex');
  if (oid !== pointer.oid) {
    throw new Error(
      `Refusing ${key}: content hash does not match the LFS pointer`
    );
  }
  return bytes;
}

async function writeBytes(file: string, bytes: Uint8Array): Promise<void> {
  const temporary = `${file}.${process.pid}.hydrate`;
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const files = (
    await Promise.all(
      ROOTS.map((root) => collectFiles(root.dir, root.extensions))
    )
  ).flat();
  const pointers: PointerFile[] = [];
  for (const file of files) {
    const pointer = await readPointer(file);
    if (pointer) {
      pointers.push({
        file,
        key: relative('public', file).split(sep).join('/'),
        pointer,
      });
    }
  }

  if (pointers.length === 0) {
    console.log('Local image files are already present.');
    return;
  }

  const downloaded = new Map<string, Uint8Array>();
  for (const item of pointers) {
    let bytes = downloaded.get(item.pointer.oid);
    if (!bytes) {
      bytes = await download(item.key, item.pointer);
      downloaded.set(item.pointer.oid, bytes);
    }
    if (bytes.byteLength !== item.pointer.size) {
      throw new Error(
        `Refusing ${item.key}: size does not match ${item.pointer.oid}`
      );
    }
    await writeBytes(item.file, bytes);
    console.log(`Hydrated ${item.key} (${bytes.byteLength} bytes).`);
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

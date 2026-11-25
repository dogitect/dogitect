#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Mirrors public/images/**/*.{png,jpg} to R2 `images/` and public/documents/**/*.pdf
// to R2 `documents/`. Unchanged objects are skipped by SHA-256 metadata.
// An empty local tree refuses to run so a missing checkout cannot wipe
// that prefix. PDFs are stored as the original bytes with an attachment
// disposition. They are not image transformations.
//
// Required env: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
// Usage: bun run images:sync

import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  CONTENT_HASH_LENGTH,
  contentHashId,
  DOCUMENT_KEY_PREFIX,
  EmptyImageSetError,
  IMAGE_CACHE_CONTROL,
  IMAGE_KEY_PREFIX,
  JPEG_CONTENT_TYPE,
  PDF_CONTENT_TYPE,
  PNG_CONTENT_TYPE,
  planImageSync,
  toObjectKey,
  type LocalImage,
  type RemoteImage,
} from './image-sync-plan';

const BUCKET = 'assets';
const CONCURRENCY = 8;
const DELETE_BATCH = 1000;

interface AssetKind {
  readonly extension: '.png' | '.jpg' | '.pdf';
  readonly contentType: string;
}

interface AssetTree {
  readonly dir: string;
  readonly kinds: readonly AssetKind[];
  readonly prefix: string;
  readonly attachment: boolean;
}

const TREES: readonly AssetTree[] = [
  {
    dir: 'public/images',
    kinds: [
      { extension: '.png', contentType: PNG_CONTENT_TYPE },
      { extension: '.jpg', contentType: JPEG_CONTENT_TYPE },
    ],
    prefix: IMAGE_KEY_PREFIX,
    attachment: false,
  },
  {
    dir: 'public/documents',
    kinds: [{ extension: '.pdf', contentType: PDF_CONTENT_TYPE }],
    prefix: DOCUMENT_KEY_PREFIX,
    attachment: true,
  },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function client(): S3Client {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

function contentTypeFor(tree: AssetTree, key: string): string {
  const kind = tree.kinds.find((item) => key.endsWith(item.extension));
  if (!kind) {
    throw new Error(`Refusing content type: ${key}`);
  }
  return kind.contentType;
}

async function collectLocal(tree: AssetTree): Promise<LocalImage[]> {
  const images: LocalImage[] = [];
  for (const kind of tree.kinds) {
    const files = await collectFiles(tree.dir, kind.extension);
    for (const file of files) {
      const key = toObjectKey(relative('public', file).split(sep).join('/'), {
        prefix: tree.prefix,
        extension: kind.extension,
      });
      const bytes = await readFile(file);
      const sha256 = contentHashId(
        createHash('sha256').update(bytes).digest('hex')
      );
      if (sha256.length !== CONTENT_HASH_LENGTH) {
        throw new Error(`Unexpected hash length for ${key}`);
      }
      images.push({ key, sha256 });
    }
  }
  return images;
}

async function collectFiles(dir: string, extension: string): Promise<string[]> {
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
      files.push(...(await collectFiles(path, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
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

async function listRemoteKeys(s3: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const object of page.Contents ?? []) {
      if (object.Key && object.Key.startsWith(prefix)) {
        keys.push(object.Key);
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function headHash(
  s3: S3Client,
  key: string
): Promise<string | undefined> {
  try {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return head.Metadata?.['sha256'];
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return record.name === 'NotFound' || record.$metadata?.httpStatusCode === 404;
}

async function mapPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  const run = async (): Promise<void> => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) {
        return;
      }
      const item = items[index];
      if (item !== undefined) {
        await worker(item);
      }
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    run()
  );
  await Promise.all(runners);
}

function attachmentName(key: string): string {
  const name = key.split('/').pop() ?? 'download.pdf';
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error(`Refusing attachment name: ${name}`);
  }
  return name;
}

async function syncTree(
  s3: S3Client,
  tree: AssetTree,
  local: readonly LocalImage[]
): Promise<void> {
  const remoteKeys = await listRemoteKeys(s3, tree.prefix);
  const localKeys = new Set(local.map((image) => image.key));
  const remote: RemoteImage[] = [];

  await mapPool(remoteKeys, CONCURRENCY, async (key) => {
    const sha256 = localKeys.has(key) ? await headHash(s3, key) : undefined;
    remote.push({ key, sha256 });
  });

  const plan = planImageSync(local, remote);
  console.log(
    `Syncing ${local.length} file(s) under ${tree.prefix}: ${plan.uploads.length} upload(s), ${plan.deletions.length} deletion(s).`
  );

  const byKey = new Map(local.map((image) => [image.key, image]));
  await mapPool(plan.uploads, CONCURRENCY, async (image) => {
    const bytes = await readFile(join('public', image.key));
    const current = byKey.get(image.key);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: image.key,
        Body: bytes,
        ContentType: contentTypeFor(tree, image.key),
        CacheControl: IMAGE_CACHE_CONTROL,
        ContentDisposition: tree.attachment
          ? `attachment; filename="${attachmentName(image.key)}"`
          : undefined,
        Metadata: { sha256: current?.sha256 ?? image.sha256 },
      })
    );
    console.log(`  put ${image.key}`);
  });

  for (let offset = 0; offset < plan.deletions.length; offset += DELETE_BATCH) {
    const batch = plan.deletions.slice(offset, offset + DELETE_BATCH);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    );
    for (const key of batch) {
      console.log(`  delete ${key}`);
    }
  }
}

async function main(): Promise<void> {
  const collected = await Promise.all(
    TREES.map(async (tree) => ({ tree, local: await collectLocal(tree) }))
  );
  for (const { tree, local } of collected) {
    if (local.length === 0) {
      throw new EmptyImageSetError(tree.prefix);
    }
  }

  const s3 = client();
  for (const { tree, local } of collected) {
    await syncTree(s3, tree, local);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

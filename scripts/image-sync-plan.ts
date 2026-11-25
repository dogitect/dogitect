// Copyright 2026 Leon Xia. MIT License.

/**
 * Pure plan for mirroring public assets to the R2 bucket.
 * Images use the `images/` prefix. PDFs use `documents/`.
 * The S3 client lives in the sync script; this module is what the tests cover.
 */

export const PNG_CONTENT_TYPE = 'image/png';

export const JPEG_CONTENT_TYPE = 'image/jpeg';

export const PDF_CONTENT_TYPE = 'application/pdf';

export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const IMAGE_KEY_PREFIX = 'images/';

export const DOCUMENT_KEY_PREFIX = 'documents/';

export interface ObjectKeyRule {
  readonly prefix: string;
  readonly extension: string;
}

export const CONTENT_HASH_LENGTH = 16;

/** Short content id stored in object metadata and in transformation URLs. */
export function contentHashId(sha256Hex: string): string {
  return sha256Hex.slice(0, CONTENT_HASH_LENGTH);
}

export class EmptyImageSetError extends Error {
  constructor(prefix = IMAGE_KEY_PREFIX) {
    super(
      `Refusing to sync: no local files. Deleting would empty the ${prefix} prefix.`
    );
    this.name = 'EmptyImageSetError';
  }
}

export interface LocalImage {
  readonly key: string;
  readonly sha256: string;
}

export interface RemoteImage {
  readonly key: string;
  readonly sha256?: string;
}

export interface ImageSyncPlan {
  readonly uploads: readonly LocalImage[];
  readonly deletions: readonly string[];
}

/** Object key for a public-relative asset. Rejects traversal and the wrong type. */
export function toObjectKey(
  relativePath: string,
  rule: ObjectKeyRule = { prefix: IMAGE_KEY_PREFIX, extension: '.png' }
): string {
  const key = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = key.split('/');
  if (
    !key.startsWith(rule.prefix) ||
    !key.endsWith(rule.extension) ||
    parts.some((part) => part === '' || part === '..' || part === '.')
  ) {
    throw new Error(`Refusing object key: ${relativePath}`);
  }
  return key;
}

/**
 * Uploads objects whose hash differs and deletes remote keys that are gone
 * locally. An empty local set throws before any deletion is planned.
 */
export function planImageSync(
  local: readonly LocalImage[],
  remote: readonly RemoteImage[]
): ImageSyncPlan {
  if (local.length === 0) {
    throw new EmptyImageSetError();
  }

  const localByKey = new Map(local.map((image) => [image.key, image]));
  const uploads = local.filter((image) => {
    const current = remote.find((item) => item.key === image.key);
    return current?.sha256 !== image.sha256;
  });
  const deletions = remote
    .map((image) => image.key)
    .filter((key) => !localByKey.has(key));

  return { uploads, deletions };
}

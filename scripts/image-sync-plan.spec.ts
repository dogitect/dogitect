// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import {
  CONTENT_HASH_LENGTH,
  contentHashId,
  EmptyImageSetError,
  DOCUMENT_KEY_PREFIX,
  IMAGE_CACHE_CONTROL,
  IMAGE_KEY_PREFIX,
  PDF_CONTENT_TYPE,
  PNG_CONTENT_TYPE,
  planImageSync,
  toObjectKey,
  type LocalImage,
  type RemoteImage,
} from './image-sync-plan';

const local = (key: string, sha256: string): LocalImage => ({ key, sha256 });
const remote = (key: string, sha256?: string): RemoteImage => ({
  key,
  sha256,
});

describe('toObjectKey', () => {
  it('keeps a public images path as the object key', () => {
    expect(toObjectKey('images/insights/covers/boardroom.png')).toBe(
      'images/insights/covers/boardroom.png'
    );
    expect(toObjectKey('/images/bg.png')).toBe('images/bg.png');
  });

  it('rejects traversal and non-PNGs', () => {
    expect(() => toObjectKey('images/../secret.png')).toThrow(
      /Refusing object key/
    );
    expect(() => toObjectKey('images/photo.jpg')).toThrow(
      /Refusing object key/
    );
    expect(() => toObjectKey('other/photo.png')).toThrow(/Refusing object key/);
  });

  it('accepts a case PDF and rejects a PDF stored under images', () => {
    expect(
      toObjectKey('documents/insights/boardroom/annual-report.pdf', {
        prefix: DOCUMENT_KEY_PREFIX,
        extension: '.pdf',
      })
    ).toBe('documents/insights/boardroom/annual-report.pdf');
    expect(() =>
      toObjectKey('images/insights/boardroom/annual-report.pdf', {
        prefix: DOCUMENT_KEY_PREFIX,
        extension: '.pdf',
      })
    ).toThrow(/Refusing object key/);
  });
});

describe('planImageSync', () => {
  it('refuses to plan deletions when there are no local PNGs', () => {
    const remoteImages = [remote('images/old.png', 'abc')];
    expect(() => planImageSync([], remoteImages)).toThrow(EmptyImageSetError);
  });

  it('uploads new objects and deletes remote keys that are not local', () => {
    const plan = planImageSync(
      [local('images/keep.png', 'same'), local('images/new.png', 'bbb')],
      [
        remote('images/keep.png', 'same'),
        remote('images/stale.png', 'old'),
        remote('images/changed.png', 'before'),
      ]
    );

    expect(plan.uploads.map((image) => image.key)).toEqual(['images/new.png']);
    expect(plan.deletions).toEqual(['images/stale.png', 'images/changed.png']);
  });

  it('reuploads when the stored hash differs', () => {
    const plan = planImageSync(
      [local('images/a.png', 'after')],
      [remote('images/a.png', 'before')]
    );

    expect(plan.uploads).toEqual([local('images/a.png', 'after')]);
    expect(plan.deletions).toEqual([]);
  });

  it('skips an object whose hash already matches', () => {
    const plan = planImageSync(
      [local('images/a.png', 'same')],
      [remote('images/a.png', 'same')]
    );

    expect(plan.uploads).toEqual([]);
    expect(plan.deletions).toEqual([]);
  });
});

describe('image sync metadata', () => {
  it('publishes PNGs with an immutable cache header', () => {
    expect(PNG_CONTENT_TYPE).toBe('image/png');
    expect(PDF_CONTENT_TYPE).toBe('application/pdf');
    expect(IMAGE_CACHE_CONTROL).toBe('public, max-age=31536000, immutable');
    expect(IMAGE_KEY_PREFIX).toBe('images/');
    expect(DOCUMENT_KEY_PREFIX).toBe('documents/');
  });

  it('shortens a sha256 hex digest', () => {
    expect(contentHashId('a'.repeat(64))).toBe('a'.repeat(CONTENT_HASH_LENGTH));
  });
});

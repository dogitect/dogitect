// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import { parseLfsPointer } from './hydrate-lfs-assets';

const POINTER = `version https://git-lfs.github.com/spec/v1
oid sha256:18eef1bf9debd6b1b416ba768f7047dd3715c50f3b96b7ad0350e46a454eb688
size 19545212
`;

describe('parseLfsPointer', () => {
  it('reads the oid and size from a Git LFS pointer', () => {
    expect(parseLfsPointer(POINTER)).toEqual({
      oid: '18eef1bf9debd6b1b416ba768f7047dd3715c50f3b96b7ad0350e46a454eb688',
      size: 19545212,
    });
  });

  it('ignores real image and document bytes', () => {
    expect(parseLfsPointer('\x89PNG\r\n')).toBeNull();
    expect(parseLfsPointer('%PDF-1.4')).toBeNull();
    expect(parseLfsPointer('')).toBeNull();
  });
});

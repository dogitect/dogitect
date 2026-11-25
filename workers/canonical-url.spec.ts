// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import { canonicalRequestUrl } from './canonical-url';

describe('canonicalRequestUrl', () => {
  it('drops a trailing slash and keeps the query', () => {
    const canonical = canonicalRequestUrl(
      new URL('https://dogitect.com/about/?ref=nav')
    );

    expect(canonical?.toString()).toBe('https://dogitect.com/about?ref=nav');
  });

  it('collapses repeated trailing slashes on nested routes', () => {
    expect(
      canonicalRequestUrl(
        new URL('https://dogitect.com/insights/inference-platform//')
      )?.pathname
    ).toBe('/insights/inference-platform');
  });

  it('leaves the apex root and extensionless paths unchanged', () => {
    expect(canonicalRequestUrl(new URL('https://dogitect.com/'))).toBeNull();
    expect(
      canonicalRequestUrl(new URL('https://dogitect.com/about'))
    ).toBeNull();
    expect(
      canonicalRequestUrl(new URL('https://dogitect.com/main.js'))
    ).toBeNull();
  });

  it('sends www and a trailing slash to the apex in one hop', () => {
    const canonical = canonicalRequestUrl(
      new URL('https://www.dogitect.com/blog/')
    );

    expect(canonical?.toString()).toBe('https://dogitect.com/blog');
  });
});

// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import {
  ASSETS_ORIGIN,
  buildImageUrl,
  buildOgImageUrl,
  buildSrcset,
  CARD_SIZES,
  CARD_SRC_WIDTH,
  CARD_WIDTHS,
  FULL_SIZES,
  FULL_SRC_WIDTH,
  FULL_WIDTHS,
  HERO_IMAGE_PATH,
  IMAGE_QUALITY,
  OG_IMAGE_WIDTH,
  buildDocumentUrl,
  projectPdfPath,
  projectStillPath,
  stampIndexHtml,
} from './image-delivery';

const SLIDE = 'images/insights/boardroom/annual-report.png';

describe('buildImageUrl', () => {
  it('builds a transformation URL with the locked option order', () => {
    expect(
      buildImageUrl({
        assetsOrigin: ASSETS_ORIGIN,
        path: SLIDE,
        width: 1920,
        version: 'abc123',
      })
    ).toBe(
      `${ASSETS_ORIGIN}/cdn-cgi/image/width=1920,quality=${IMAGE_QUALITY},format=auto,fit=scale-down/${SLIDE}?v=abc123`
    );
  });

  it('uses jpeg for Open Graph images', () => {
    expect(buildOgImageUrl(SLIDE)).toBe(
      buildImageUrl({
        assetsOrigin: ASSETS_ORIGIN,
        path: SLIDE,
        width: OG_IMAGE_WIDTH,
        format: 'jpeg',
      })
    );
  });

  it('serves the original file when there is no CDN origin', () => {
    expect(
      buildImageUrl({
        assetsOrigin: '',
        path: SLIDE,
        width: 1920,
        version: 'abc123',
      })
    ).toBe(`/${SLIDE}?v=abc123`);
    expect(
      buildSrcset({
        assetsOrigin: '',
        path: SLIDE,
        widths: FULL_WIDTHS,
      })
    ).toBe('');
  });

  it('returns an empty string for an empty path', () => {
    expect(
      buildImageUrl({
        assetsOrigin: ASSETS_ORIGIN,
        path: '',
        width: FULL_SRC_WIDTH,
      })
    ).toBe('');
  });
});

describe('buildSrcset', () => {
  it('includes the full-bleed src as one candidate', () => {
    const src = buildImageUrl({
      assetsOrigin: ASSETS_ORIGIN,
      path: SLIDE,
      width: FULL_SRC_WIDTH,
      version: 'abc123',
    });
    const srcset = buildSrcset({
      assetsOrigin: ASSETS_ORIGIN,
      path: SLIDE,
      widths: FULL_WIDTHS,
      version: 'abc123',
    });

    expect(srcset.split(', ')).toContain(`${src} ${FULL_SRC_WIDTH}w`);
    expect(srcset).toContain('640w');
    expect(srcset).toContain('2560w');
  });

  it('uses the insight-card widths', () => {
    const src = buildImageUrl({
      assetsOrigin: ASSETS_ORIGIN,
      path: 'images/insights/covers/boardroom.png',
      width: CARD_SRC_WIDTH,
    });
    const srcset = buildSrcset({
      assetsOrigin: ASSETS_ORIGIN,
      path: 'images/insights/covers/boardroom.png',
      widths: CARD_WIDTHS,
    });

    expect(CARD_SIZES).toBe('(min-width: 1025px) 50vw, 100vw');
    expect(FULL_SIZES).toBe('100vw');
    expect(srcset.split(', ')).toContain(`${src} ${CARD_SRC_WIDTH}w`);
  });
});

describe('case files', () => {
  it('keeps the still and the PDF on separate prefixes', () => {
    expect(projectStillPath('inference-platform')).toBe(
      'images/insights/inference-platform.png'
    );
    expect(projectPdfPath('inference-platform')).toBe(
      'documents/insights/inference-platform.pdf'
    );
  });

  it('serves a PDF from the site root in development and from R2 in production', () => {
    const path = projectPdfPath('inference-platform');
    expect(
      buildDocumentUrl({ assetsOrigin: '', path, version: 'abc123' })
    ).toBe(`/${path}?v=abc123`);
    expect(
      buildDocumentUrl({
        assetsOrigin: ASSETS_ORIGIN,
        path,
        version: 'abc123',
      })
    ).toBe(`${ASSETS_ORIGIN}/${path}?v=abc123`);
    expect(buildDocumentUrl({ assetsOrigin: ASSETS_ORIGIN, path: SLIDE })).toBe(
      ''
    );
  });
});

describe('stampIndexHtml', () => {
  const bare = buildOgImageUrl('images/social-preview.png');
  const html = `<meta property="og:image" content="${bare}" />\n<!-- hero-preload -->`;

  it('adds the content hash and the hero preload', () => {
    const stamped = stampIndexHtml(html, {
      'images/social-preview.png': 'abc123',
      [HERO_IMAGE_PATH]: 'def456',
    });

    expect(stamped).toContain(`${bare}?v=abc123`);
    expect(stamped).not.toContain('<!-- hero-preload -->');
    expect(stamped).toContain('rel="preload" as="image"');
    expect(stamped).toContain(`/${HERO_IMAGE_PATH}?v=def456`);
    expect(stamped).toContain('imagesizes="100vw"');
  });

  it('is idempotent', () => {
    const manifest = {
      'images/social-preview.png': 'abc123',
      [HERO_IMAGE_PATH]: 'def456',
    };
    const once = stampIndexHtml(html, manifest);
    expect(stampIndexHtml(once, manifest)).toBe(once);
  });

  it('replaces a previous hash when the file changes', () => {
    const first = stampIndexHtml(html, {
      'images/social-preview.png': 'abc123',
    });
    const next = stampIndexHtml(first, {
      'images/social-preview.png': 'fff999',
    });

    expect(next).toContain(`${bare}?v=fff999`);
    expect(next).not.toContain('v=abc123');
  });
});

// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Builds image URLs for the app and the production HTML stamp.
 * An empty `assetsOrigin` serves the original file from the site root, which
 * is what local development uses. A CDN origin wraps the file in a Cloudflare
 * Image Transformation.
 */

export const ASSETS_ORIGIN = 'https://assets.dogitect.com';

export const IMAGE_QUALITY = 85;

export const OG_IMAGE_WIDTH = 1280;

export const FULL_WIDTHS = [640, 960, 1280, 1920, 2560] as const;

export const CARD_WIDTHS = [480, 768, 1200] as const;

/** Fallback `src` for full-bleed images. Also present in `FULL_WIDTHS`. */
export const FULL_SRC_WIDTH = 1920;

/** Fallback `src` for insight cards. Also present in `CARD_WIDTHS`. */
export const CARD_SRC_WIDTH = 768;

export const FULL_SIZES = '100vw';

/** Insight cards are half the viewport above the 1024px grid breakpoint. */
export const CARD_SIZES = '(min-width: 1025px) 50vw, 100vw';

export const HERO_IMAGE_PATH = 'images/bg.png';

export const ABOUT_IMAGE_PATH = 'images/about.jpg';

export const SOCIAL_PREVIEW_PATH = 'images/social-preview.png';

export const LOGO_IMAGE_PATH = 'images/logo.png';

const CDN_IMAGE_PREFIX = '/cdn-cgi/image/';

const DELIVERY_URL =
  /https:\/\/assets\.dogitect\.com\/cdn-cgi\/image\/[^"'\\\s<>]+/g;

const HERO_PRELOAD_TAG = /<link rel="preload" as="image"[^>]*>/;

export type ImageFormat = 'auto' | 'jpeg';

export type ImagePreset = 'full' | 'card';

export interface ImageUrlInput {
  readonly assetsOrigin: string;
  readonly path: string;
  readonly width: number;
  readonly version?: string;
  readonly format?: ImageFormat;
  readonly quality?: number;
}

export interface SrcsetInput {
  readonly assetsOrigin: string;
  readonly path: string;
  readonly widths: readonly number[];
  readonly version?: string;
  readonly format?: ImageFormat;
}

/** Strips a leading slash so logical paths stay `images/...`. */
export function normalizeImagePath(path: string): string {
  return path.replace(/^\/+/, '');
}

const ASSET_SLUG = /^[a-zA-Z0-9_-]+$/;

function assertAssetSlug(slug: string): void {
  if (!ASSET_SLUG.test(slug)) {
    throw new Error(`Refusing asset slug: ${slug}`);
  }
}

/** One still for a case. The document itself is a PDF, not a slide sequence. */
export function projectStillPath(caseSlug: string): string {
  assertAssetSlug(caseSlug);
  return `images/insights/${caseSlug}.png`;
}

/** High-quality PDF for a case. Stored beside images, never transformed. */
export function projectPdfPath(caseSlug: string): string {
  assertAssetSlug(caseSlug);
  return `documents/insights/${caseSlug}.pdf`;
}

/** Delivery URL. Empty path returns an empty string. */
export function buildImageUrl(input: ImageUrlInput): string {
  const path = normalizeImagePath(input.path);
  if (path === '') {
    return '';
  }

  const version = input.version ? `?v=${input.version}` : '';
  if (input.assetsOrigin === '') {
    return `/${path}${version}`;
  }

  const format = input.format ?? 'auto';
  const quality = input.quality ?? IMAGE_QUALITY;
  const options = `width=${input.width},quality=${quality},format=${format},fit=scale-down`;
  return `${input.assetsOrigin}${CDN_IMAGE_PREFIX}${options}/${path}${version}`;
}

export interface DocumentUrlInput {
  readonly assetsOrigin: string;
  readonly path: string;
  readonly version?: string;
}

/**
 * Direct PDF URL. An empty origin serves the file from the site root.
 * A CDN origin uses the R2 object itself, not an image transformation.
 */
export function buildDocumentUrl(input: DocumentUrlInput): string {
  const path = normalizeImagePath(input.path);
  if (path === '' || !path.startsWith('documents/') || !path.endsWith('.pdf')) {
    return '';
  }

  const version = input.version ? `?v=${input.version}` : '';
  if (input.assetsOrigin === '') {
    return `/${path}${version}`;
  }
  return `${input.assetsOrigin}/${path}${version}`;
}

/**
 * `srcset` whose candidates use the same origin, format, and version.
 * Local files are not resized, so development returns an empty srcset and the
 * browser requests the original once.
 */
export function buildSrcset(input: SrcsetInput): string {
  if (input.assetsOrigin === '' || normalizeImagePath(input.path) === '') {
    return '';
  }

  return input.widths
    .map((width) => {
      const url = buildImageUrl({
        assetsOrigin: input.assetsOrigin,
        path: input.path,
        width,
        version: input.version,
        format: input.format,
      });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/** JPEG URL for crawlers that do not render AVIF. */
export function buildOgImageUrl(
  path: string,
  version?: string,
  assetsOrigin: string = ASSETS_ORIGIN
): string {
  return buildImageUrl({
    assetsOrigin,
    path,
    width: OG_IMAGE_WIDTH,
    format: 'jpeg',
    version,
  });
}

/** Logical `images/...` path inside a transformation URL, if one is present. */
export function logicalPathFromDeliveryUrl(url: string): string | null {
  const match = url.match(/\/cdn-cgi\/image\/[^/]+\/(images\/[^?\s]+)/);
  return match?.[1] ?? null;
}

/** Preload tag for the hero. `href` is the 1920 candidate also listed in `imagesrcset`. */
export function heroPreloadTag(version?: string): string {
  const src = buildImageUrl({
    assetsOrigin: ASSETS_ORIGIN,
    path: HERO_IMAGE_PATH,
    width: FULL_SRC_WIDTH,
    version,
  });
  const srcset = buildSrcset({
    assetsOrigin: ASSETS_ORIGIN,
    path: HERO_IMAGE_PATH,
    widths: FULL_WIDTHS,
    version,
  });
  return `<link rel="preload" as="image" href="${src}" imagesrcset="${srcset}" imagesizes="${FULL_SIZES}" fetchpriority="high" />`;
}

/**
 * Rewrites transformation URLs in `index.html` to the manifest hash and
 * inserts the hero preload. Running it twice yields the same document.
 */
export function stampIndexHtml(
  html: string,
  manifest: Readonly<Record<string, string>>
): string {
  const versioned = html.replace(DELIVERY_URL, (url) => {
    const path = logicalPathFromDeliveryUrl(url);
    if (path === null) {
      return url;
    }
    const bare = url.replace(/\?v=[0-9a-f]+$/, '');
    const version = manifest[path];
    return version ? `${bare}?v=${version}` : bare;
  });

  const tag = heroPreloadTag(manifest[HERO_IMAGE_PATH]);
  if (versioned.includes('<!-- hero-preload -->')) {
    return versioned.replace('<!-- hero-preload -->', tag);
  }
  if (HERO_PRELOAD_TAG.test(versioned)) {
    return versioned.replace(HERO_PRELOAD_TAG, tag);
  }
  return versioned;
}

// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Serves the static site and redirects www to the apex.
 * A trailing slash redirects to the same path without one, so `/about/`
 * and `/about` are not both 200. Asset responses get security headers when
 * `_headers` did not set them. HTML documents receive a style nonce and the
 * route's title, description, and canonical URL so crawlers are not stuck
 * on the homepage tags.
 */

import {
  applyDocumentMeta,
  ogImageUrl,
  STATIC_PAGES,
  type DocumentMeta,
} from '../src/app/core/seo/document-meta';
import { canonicalRequestUrl } from './canonical-url';

interface Env {
  readonly ASSETS: Fetcher;
}

const CONTENT_SECURITY_POLICY = contentSecurityPolicy();

function contentSecurityPolicy(styleNonce?: string): string {
  const styleSrc = styleNonce
    ? `style-src 'self' 'nonce-${styleNonce}' https://fonts.googleapis.com`
    : "style-src 'self' https://fonts.googleapis.com";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' https://www.googletagmanager.com",
    "script-src-attr 'none'",
    styleSrc,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https://assets.dogitect.com https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net",
    "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://stats.g.doubleclick.net",
    'frame-src https://embed.figma.com',
    'upgrade-insecure-requests',
  ].join('; ');
}

function createStyleNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const SECURITY_HEADERS: readonly (readonly [string, string])[] = [
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['X-Frame-Options', 'DENY'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  ['Content-Security-Policy', CONTENT_SECURITY_POLICY],
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const canonical = canonicalRequestUrl(url);
    if (canonical) {
      return Response.redirect(canonical.toString(), 301);
    }

    const asset = await env.ASSETS.fetch(request);
    if (isHtmlDocument(asset)) {
      return withDocumentSecurityHeaders(asset, url, env);
    }
    return withSecurityHeaders(asset);
  },
};

function isHtmlDocument(response: Response): boolean {
  return (
    response.status === 200 &&
    (response.headers.get('content-type') ?? '').includes('text/html')
  );
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  applySecurityHeaders(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function withDocumentSecurityHeaders(
  response: Response,
  requestUrl: URL,
  env: Env
): Promise<Response> {
  const nonce = createStyleNonce();
  const headers = new Headers(response.headers);
  applySecurityHeaders(headers);
  headers.set('Content-Security-Policy', contentSecurityPolicy(nonce));
  headers.set('Cache-Control', 'no-store');
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');

  let html = (await response.text()).replace(
    /<app-root(?![^>]*\bngCspNonce=)([^>]*)>/,
    `<app-root ngCspNonce="${nonce}"$1>`
  );
  const route = await resolveDocument(env, requestUrl);
  if (route.meta) {
    html = applyDocumentMeta(html, route.meta);
  }

  return new Response(html, {
    status: route.status,
    statusText: route.status === 404 ? 'Not Found' : response.statusText,
    headers,
  });
}

const SLUG = /^[a-z0-9-]+$/;

interface InsightEntry {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly date?: string;
}

interface BlogIndexEntry {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly draft?: boolean;
  readonly cover?: string;
}

let casesCache: Promise<readonly InsightEntry[]> | null = null;
let blogCache: Promise<readonly BlogIndexEntry[]> | null = null;

async function resolveDocument(
  env: Env,
  requestUrl: URL
): Promise<{ status: number; meta: DocumentMeta | null }> {
  const path = normalizePath(requestUrl.pathname);
  if (path === '/' || path.split('/').pop()?.includes('.')) {
    return { status: 200, meta: null };
  }

  const staticKey = staticPageKey(path);
  if (staticKey) {
    return { status: 200, meta: staticDocument(staticKey, path) };
  }

  const insight = /^\/insights\/([^/]+)$/.exec(path);
  if (insight) {
    return insightDocument(env, requestUrl.origin, path, insight[1] ?? '');
  }

  const post = /^\/blog\/([^/]+)$/.exec(path);
  if (post) {
    return blogDocument(env, requestUrl.origin, path, post[1] ?? '');
  }

  return missingDocument(path);
}

function staticPageKey(path: string): keyof typeof STATIC_PAGES | null {
  if (path === '/insights') {
    return 'insights';
  }
  if (path === '/blog') {
    return 'blog';
  }
  if (path === '/about') {
    return 'about';
  }
  if (path === '/contact') {
    return 'contact';
  }
  return null;
}

function staticDocument(
  key: keyof typeof STATIC_PAGES,
  path: string
): DocumentMeta {
  const page = STATIC_PAGES[key];
  return {
    title: `${page.title} | dogitect`,
    description: page.description,
    canonicalPath: path,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: page.title, path },
    ],
  };
}

async function insightDocument(
  env: Env,
  origin: string,
  path: string,
  slug: string
): Promise<{ status: number; meta: DocumentMeta }> {
  if (!SLUG.test(slug)) {
    return missingDocument(path);
  }
  const item = (await loadCases(env, origin)).find(
    (entry) => entry.slug === slug
  );
  if (!item?.title || !item.description) {
    return missingDocument(path);
  }
  return {
    status: 200,
    meta: {
      title: `${item.title} | dogitect`,
      description: item.description,
      canonicalPath: path,
      ogType: 'article',
      ogImage: ogImageUrl(`images/insights/${slug}.png`),
      ...(item.date ? { published: item.date } : {}),
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Insights', path: '/insights' },
        { name: item.title, path },
      ],
    },
  };
}

async function blogDocument(
  env: Env,
  origin: string,
  path: string,
  slug: string
): Promise<{ status: number; meta: DocumentMeta }> {
  if (!SLUG.test(slug)) {
    return missingDocument(path);
  }
  const post = (await loadBlog(env, origin)).find(
    (item) => item.slug === slug && item.draft !== true
  );
  if (!post) {
    return missingDocument(path);
  }
  return {
    status: 200,
    meta: {
      title: `${post.title} | dogitect`,
      description: post.description,
      canonicalPath: path,
      ogType: 'article',
      ogImage: ogImageUrl(post.cover || 'images/blog/default-cover.png'),
      published: post.date,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.title, path },
      ],
    },
  };
}

function missingDocument(path: string): {
  status: number;
  meta: DocumentMeta;
} {
  return {
    status: 404,
    meta: {
      title: '404 | dogitect',
      description:
        'The page you are looking for does not exist or has been moved. Return to dogitect.',
      canonicalPath: path,
      robots: 'noindex, nofollow',
      googlebot: 'noindex, nofollow',
      breadcrumbs: [{ name: 'Home', path: '/' }],
    },
  };
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname;
}

async function loadCases(
  env: Env,
  origin: string
): Promise<readonly InsightEntry[]> {
  if (casesCache) {
    return casesCache;
  }
  const pending = readJson<readonly InsightEntry[]>(
    env,
    origin,
    '/content/insights/cases.json'
  ).then((cases) => {
    if (!cases) {
      casesCache = null;
      return [];
    }
    return cases;
  });
  casesCache = pending;
  return pending;
}

async function loadBlog(
  env: Env,
  origin: string
): Promise<readonly BlogIndexEntry[]> {
  if (blogCache) {
    return blogCache;
  }
  const pending = readJson<readonly BlogIndexEntry[]>(
    env,
    origin,
    '/content/blog/index.json'
  ).then((posts) => {
    if (!posts) {
      blogCache = null;
      return [];
    }
    return posts;
  });
  blogCache = pending;
  return pending;
}

async function readJson<T>(
  env: Env,
  origin: string,
  path: string
): Promise<T | null> {
  const response = await env.ASSETS.fetch(new URL(path, origin));
  if (!response.ok) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of SECURITY_HEADERS) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }
}

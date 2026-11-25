// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Rewrites the tags crawlers read in the first HTML byte.
 * Angular updates the same tags after boot. The Worker uses this module
 * so a route is not stuck with the homepage title and canonical URL.
 */

import { buildOgImageUrl } from '../images/image-delivery';

export const SITE_ORIGIN = 'https://dogitect.com';

export interface StaticPageCopy {
  readonly title: string;
  readonly description: string;
}

export const STATIC_PAGES = {
  insights: {
    title: 'Insights',
    description: 'Selected architecture from dogitect.',
  },
  blog: {
    title: 'Blog',
    description:
      'Notes from dogitect on AI and cloud architecture: systems, models, and the decisions around them.',
  },
  about: {
    title: 'About',
    description:
      'Leon Xia is an independent AI and cloud solutions architect. dogitect is the practice.',
  },
  contact: {
    title: 'Contact',
    description:
      'Contact Leon Xia at dogitect about a system, platform, or architecture decision. Email contact@dogitect.com.',
  },
} as const satisfies Record<string, StaticPageCopy>;

export interface DocumentCrumb {
  readonly name: string;
  readonly path: string;
}

export interface DocumentMeta {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly robots?: string;
  readonly googlebot?: string;
  readonly ogType?: 'website' | 'article';
  readonly ogImage?: string;
  readonly published?: string;
  readonly breadcrumbs?: readonly DocumentCrumb[];
}

/** JPEG URL for a logical `images/...` path. Crawlers do not render AVIF. */
export function ogImageUrl(path: string): string {
  return buildOgImageUrl(path);
}

/** Rewrites title, description, canonical, Open Graph, and breadcrumbs. */
export function applyDocumentMeta(html: string, meta: DocumentMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(`${SITE_ORIGIN}${meta.canonicalPath}`);
  let next = html;
  next = replaceText(next, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  next = replaceMeta(next, 'name', 'description', description);
  next = replaceMeta(next, 'name', 'robots', meta.robots ?? 'index, follow');
  if (meta.googlebot) {
    next = replaceMeta(next, 'name', 'googlebot', meta.googlebot);
  }
  next = replaceMeta(next, 'property', 'og:title', meta.title);
  next = replaceMeta(next, 'property', 'og:description', meta.description);
  next = replaceMeta(
    next,
    'property',
    'og:url',
    `${SITE_ORIGIN}${meta.canonicalPath}`
  );
  if (meta.ogImage) {
    next = replaceMeta(next, 'property', 'og:image', meta.ogImage);
    next = replaceMeta(next, 'name', 'twitter:image', meta.ogImage);
  }
  next = replaceMeta(next, 'property', 'og:image:alt', meta.title);
  next = replaceMeta(next, 'property', 'og:type', meta.ogType ?? 'website');
  next = replaceMeta(next, 'name', 'twitter:title', meta.title);
  next = replaceMeta(next, 'name', 'twitter:description', meta.description);
  next = replaceText(
    next,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  if (meta.published) {
    next = upsertMeta(
      next,
      'property',
      'article:published_time',
      meta.published
    );
  }
  if (meta.breadcrumbs) {
    next = replaceBreadcrumbs(next, meta.breadcrumbs);
  }
  return next;
}

function replaceMeta(
  html: string,
  attr: 'name' | 'property',
  key: string,
  content: string
): string {
  const pattern = new RegExp(
    `(<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content=")[^"]*(")`,
    'i'
  );
  return html.replace(pattern, `$1${escapeHtml(content)}$2`);
}

function upsertMeta(
  html: string,
  attr: 'name' | 'property',
  key: string,
  content: string
): string {
  const replaced = replaceMeta(html, attr, key, content);
  if (replaced !== html) {
    return replaced;
  }
  const tag = `    <meta ${attr}="${key}" content="${escapeHtml(content)}" />\n`;
  return html.replace('</head>', `${tag}  </head>`);
}

function replaceText(html: string, pattern: RegExp, value: string): string {
  return html.replace(pattern, value);
}

function replaceBreadcrumbs(
  html: string,
  crumbs: readonly DocumentCrumb[]
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_ORIGIN}${crumb.path}`,
    })),
  };
  const json = JSON.stringify(schema, null, 2).replace(/</g, '\\u003c');
  const script = `<script type="application/ld+json">\n${json}\n    </script>`;
  return html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    (block) => (block.includes('"@type": "BreadcrumbList"') ? script : block)
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

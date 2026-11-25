// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import { applyDocumentMeta } from './document-meta';

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>dogitect — Independent AI and cloud solutions architect</title>
    <meta
      name="description"
      content="Home description"
    />
    <meta name="robots" content="index, follow" />
    <meta
      name="googlebot"
      content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    />
    <meta property="og:type" content="website" />
    <meta
      property="og:title"
      content="Home title"
    />
    <meta
      property="og:description"
      content="Home description"
    />
    <meta
      property="og:image"
      content="https://assets.dogitect.com/images/social-preview.png"
    />
    <meta property="og:image:alt" content="dogitect" />
    <meta property="og:url" content="https://dogitect.com/" />
    <meta
      name="twitter:title"
      content="Home title"
    />
    <meta
      name="twitter:description"
      content="Home description"
    />
    <meta
      name="twitter:image"
      content="https://assets.dogitect.com/images/social-preview.png"
    />
    <link rel="canonical" href="https://dogitect.com/" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Leon Xia"
      }
    </script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": []
      }
    </script>
  </head>
  <body></body>
</html>`;

describe('applyDocumentMeta', () => {
  it('replaces the homepage tags with the route', () => {
    const html = applyDocumentMeta(HTML, {
      title: 'Insights | dogitect',
      description: 'Selected architecture',
      canonicalPath: '/insights',
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Insights', path: '/insights' },
      ],
    });

    expect(html).toContain('<title>Insights | dogitect</title>');
    expect(html).toContain('content="Selected architecture"');
    expect(html).toContain('href="https://dogitect.com/insights"');
    expect(html).toContain(
      'property="og:url" content="https://dogitect.com/insights"'
    );
    expect(html).toContain('"name": "Insights"');
    expect(html).toContain('"@type": "Person"');
    expect(html).toContain('images/social-preview.png');
    expect(html).not.toContain('content="Home description"');
  });

  it('marks an unknown route noindex and escapes the title', () => {
    const html = applyDocumentMeta(HTML, {
      title: 'A & B <case> | dogitect',
      description: 'Missing',
      canonicalPath: '/insights/missing',
      robots: 'noindex, nofollow',
      googlebot: 'noindex, nofollow',
      ogType: 'article',
      ogImage: 'https://assets.dogitect.com/images/case.png',
      published: '2026-09',
    });

    expect(html).toContain('<title>A &amp; B &lt;case&gt; | dogitect</title>');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toMatch(/name="googlebot"\s+content="noindex, nofollow"/);
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toMatch(
      /property="og:image"\s+content="https:\/\/assets\.dogitect\.com\/images\/case\.png"/
    );
    expect(html).toContain('article:published_time" content="2026-09"');
  });
});

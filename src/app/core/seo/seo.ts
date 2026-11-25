// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Document title, meta tags, and structured data. */

import { inject, PLATFORM_ID, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { buildOgImageUrl, SOCIAL_PREVIEW_PATH } from '../images/image-delivery';
import { IMAGE_MANIFEST } from '../images/image-manifest.generated';
import { STATIC_PAGES } from './document-meta';

export interface PageSeoConfig {
  /** Page title (will be appended with " | dogitect" if not homepage) */
  title: string;
  /** Meta description for the page */
  description: string;
  /** Canonical URL path (e.g., '/insights/inference-platform') */
  canonicalPath: string;
  /** Open Graph image URL (optional, uses default if not provided) */
  ogImage?: string;
  /** Page type for Open Graph (default: 'website') */
  ogType?: 'website' | 'article' | 'profile';
  /** Keywords for the page (optional) */
  keywords?: string[];
  /** Whether this is the homepage */
  isHomepage?: boolean;
  /** ISO date for article pages. */
  published?: string;
}

export interface BreadcrumbItem {
  name: string;
  /** URL path (e.g., '/insights') */
  path: string;
}

const BASE_URL = environment.siteUrl;
const BRAND_NAME = 'dogitect';
const BRAND_TITLE_SUFFIX = ` | ${BRAND_NAME}`;
const HOME_TITLE = `${BRAND_NAME} — Independent AI and cloud solutions architect`;

const DEFAULT_OG_IMAGE = buildOgImageUrl(
  SOCIAL_PREVIEW_PATH,
  IMAGE_MANIFEST[SOCIAL_PREVIEW_PATH],
  environment.assetsUrl
);

/** Page keys for the config-driven SEO setup. */
type PageKey = 'home' | 'insights' | 'blog' | 'about' | 'contact' | 'notFound';

interface PageSeoEntry {
  readonly config: PageSeoConfig;
  readonly breadcrumbs: BreadcrumbItem[];
}

/** Static SEO configuration for each page. */
const PAGE_SEO_CONFIGS: Record<PageKey, PageSeoEntry> = {
  home: {
    config: {
      title: HOME_TITLE,
      description:
        'Leon Xia is an independent AI and cloud solutions architect. dogitect is the practice: architecture for platforms, systems, and the decisions around them.',
      canonicalPath: '/',
      isHomepage: true,
      keywords: [
        'Leon Xia',
        'dogitect',
        'AI solutions architect',
        'cloud solutions architect',
        'independent architect',
        'cloud architecture',
      ],
    },
    breadcrumbs: [{ name: 'Home', path: '/' }],
  },
  insights: {
    config: {
      title: STATIC_PAGES.insights.title,
      description: STATIC_PAGES.insights.description,
      canonicalPath: '/insights',
      keywords: [
        'cloud architecture',
        'AI platform architecture',
        'solutions architecture',
        'system design',
        'Leon Xia',
      ],
    },
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Insights', path: '/insights' },
    ],
  },
  blog: {
    config: {
      title: STATIC_PAGES.blog.title,
      description: STATIC_PAGES.blog.description,
      canonicalPath: '/blog',
      keywords: [
        'AI architecture',
        'cloud architecture',
        'blog',
        'Leon Xia',
        'dogitect',
      ],
    },
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
    ],
  },
  about: {
    config: {
      title: STATIC_PAGES.about.title,
      description: STATIC_PAGES.about.description,
      canonicalPath: '/about',
      keywords: ['Leon Xia', 'dogitect', 'about', 'AI solutions architect'],
    },
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ],
  },
  contact: {
    config: {
      title: STATIC_PAGES.contact.title,
      description: STATIC_PAGES.contact.description,
      canonicalPath: '/contact',
      keywords: [
        'contact Leon Xia',
        'contact@dogitect.com',
        'hire solutions architect',
        'cloud architecture consulting',
      ],
    },
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ],
  },
  notFound: {
    config: {
      title: 'Page Not Found',
      description:
        'The page you are looking for does not exist or has been moved. Return to dogitect.',
      canonicalPath: '/',
    },
    breadcrumbs: [],
  },
};

@Service()
export class Seo {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /** Updates all SEO meta tags for a page. */
  updatePageSeo(config: PageSeoConfig): void {
    const fullTitle = config.isHomepage
      ? config.title
      : `${config.title}${BRAND_TITLE_SUFFIX}`;
    const canonicalUrl = `${BASE_URL}${config.canonicalPath}`;
    const ogImage = config.ogImage ?? DEFAULT_OG_IMAGE;

    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'robots',
      content: 'index, follow, max-snippet:-1, max-image-preview:large',
    });

    if (config.keywords?.length) {
      this.meta.updateTag({
        name: 'keywords',
        content: config.keywords.join(', '),
      });
    }

    this.meta.updateTag({
      property: 'og:title',
      content: fullTitle,
    });
    this.meta.updateTag({
      property: 'og:description',
      content: config.description,
    });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({
      property: 'og:type',
      content: config.ogType ?? 'website',
    });

    this.meta.updateTag({
      name: 'twitter:title',
      content: fullTitle,
    });
    this.meta.updateTag({
      name: 'twitter:description',
      content: config.description,
    });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    this.meta.updateTag({ property: 'og:image:alt', content: fullTitle });

    if (config.published) {
      this.meta.updateTag({
        property: 'article:published_time',
        content: config.published,
      });
    } else {
      this.meta.removeTag('property="article:published_time"');
    }

    this.updateCanonicalUrl(canonicalUrl);
  }

  /** Updates the canonical URL link element. */
  private updateCanonicalUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let link: HTMLLinkElement | null = this.document.querySelector(
      'link[rel="canonical"]'
    );

    if (link) {
      link.setAttribute('href', url);
    } else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  /** Updates the breadcrumb structured data. */
  updateBreadcrumbs(items: BreadcrumbItem[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${BASE_URL}${item.path}`,
      })),
    };

    this.updateJsonLdScript('breadcrumb-jsonld', breadcrumbSchema);
  }

  /** Adds page-specific structured data (e.g., for a work detail page). */
  updatePageSchema(schema: object): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.updateJsonLdScript('page-specific-jsonld', schema);
  }

  /** Removes page-specific structured data. */
  clearPageSchema(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const existing = this.document.getElementById('page-specific-jsonld');
    if (existing) {
      existing.remove();
    }
  }

  /** Updates or creates a JSON-LD script element. */
  private updateJsonLdScript(id: string, schema: object): void {
    let script = this.document.getElementById(id) as HTMLScriptElement | null;

    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(schema);
  }

  /** JPEG transformation URL for a case still. Crawlers do not render AVIF. */
  getWorkOgImage(coverImage: string): string {
    const path = coverImage.replace(/^\//, '');
    return buildOgImageUrl(path, IMAGE_MANIFEST[path], environment.assetsUrl);
  }

  /** Sets SEO for a page using the static configuration map. */
  setPageSeo(key: PageKey): void {
    const entry = PAGE_SEO_CONFIGS[key];
    this.updatePageSeo(entry.config);

    if (entry.breadcrumbs.length > 0) {
      this.updateBreadcrumbs(entry.breadcrumbs);
    }

    if (key === 'notFound') {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
      this.meta.updateTag({ name: 'googlebot', content: 'noindex, nofollow' });
      if (isPlatformBrowser(this.platformId)) {
        const path = this.document.location.pathname || '/';
        this.updateCanonicalUrl(`${BASE_URL}${path}`);
        this.meta.updateTag({
          property: 'og:url',
          content: `${BASE_URL}${path}`,
        });
      }
    }
  }

  /** Sets SEO for one published note, addressed at `/blog/:slug`. */
  setBlogPostSeo(post: {
    slug: string;
    title: string;
    description: string;
    date: string;
    cover?: string;
  }): void {
    const image = post.cover ? this.getWorkOgImage(post.cover) : undefined;

    this.updatePageSeo({
      title: post.title,
      description: post.description,
      canonicalPath: `/blog/${post.slug}`,
      ...(image ? { ogImage: image } : {}),
      ogType: 'article',
      published: post.date,
      keywords: [
        'AI architecture',
        'cloud architecture',
        post.title,
        'Leon Xia',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]);

    this.updatePageSchema({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      mainEntityOfPage: `${BASE_URL}/blog/${post.slug}`,
      datePublished: post.date,
      ...(image ? { image } : {}),
      author: {
        '@type': 'Person',
        name: 'Leon Xia',
        email: 'mailto:contact@dogitect.com',
      },
    });
  }

  /** Sets SEO for one case, addressed at `/insights/:slug`. */
  setCaseSeo(work: {
    slug: string;
    title: string;
    description: string;
    imagePath: string;
    date?: string;
  }): void {
    const image = this.getWorkOgImage(work.imagePath);

    this.updatePageSeo({
      title: work.title,
      description: work.description,
      canonicalPath: `/insights/${work.slug}`,
      ogImage: image,
      ogType: 'article',
      ...(work.date ? { published: work.date } : {}),
      keywords: [
        'AI architecture',
        'cloud architecture',
        work.title,
        'Leon Xia',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Insights', path: '/insights' },
      { name: work.title, path: `/insights/${work.slug}` },
    ]);

    this.updatePageSchema({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: work.title,
      description: work.description,
      url: `${BASE_URL}/insights/${work.slug}`,
      ...(work.date ? { dateCreated: work.date } : {}),
      image,
      creator: {
        '@type': 'Person',
        name: 'Leon Xia',
        email: 'mailto:contact@dogitect.com',
      },
    });
  }
}

// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview One blog note loaded from prebuilt JSON. */

import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import type { SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import type {
  BlogBlock,
  BlogCard,
  BlogPostFile,
} from '../../core/content/blog/blog.models';
import { Seo } from '../../core/seo/seo';
import { NotFoundView } from '../../shared/not-found-view/not-found-view';
import { OptimizedImage } from '../../shared/optimized-image/optimized-image';

const SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIGMA_EMBED_PREFIX = 'https://embed.figma.com/';

type RenderBlock =
  | { readonly type: 'html'; readonly html: SafeHtml }
  | { readonly type: 'image'; readonly path: string; readonly alt: string }
  | {
      readonly type: 'figma';
      readonly src: SafeResourceUrl;
      readonly title: string;
    };

type PostPhase = 'waiting' | 'missing' | 'ready';

function isBlogCard(value: unknown): value is BlogCard {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const card = value as Record<string, unknown>;
  const categories = card['categories'];
  return (
    typeof card['slug'] === 'string' &&
    typeof card['title'] === 'string' &&
    typeof card['description'] === 'string' &&
    typeof card['date'] === 'string' &&
    typeof card['draft'] === 'boolean' &&
    Array.isArray(categories) &&
    categories.every((item) => typeof item === 'string') &&
    (card['cover'] === undefined || typeof card['cover'] === 'string')
  );
}

function isBlogBlock(value: unknown): value is BlogBlock {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const block = value as Record<string, unknown>;
  if (block['type'] === 'html') {
    return typeof block['html'] === 'string';
  }
  if (block['type'] === 'image') {
    return (
      typeof block['path'] === 'string' && typeof block['alt'] === 'string'
    );
  }
  if (block['type'] === 'figma') {
    return (
      typeof block['embedUrl'] === 'string' &&
      typeof block['title'] === 'string'
    );
  }
  return false;
}

function isBlogPostFile(value: unknown): value is BlogPostFile {
  if (!isBlogCard(value)) {
    return false;
  }
  const blocks = (value as { blocks?: unknown }).blocks;
  return Array.isArray(blocks) && blocks.every(isBlogBlock);
}

/** Reading view for one blog post. */
@Component({
  selector: 'app-blog-post',
  templateUrl: './blog-post.html',
  styleUrl: './blog-post.scss',
  imports: [OptimizedImage, NotFoundView],
})
export class BlogPost {
  private readonly seo = inject(Seo);
  private readonly sanitizer = inject(DomSanitizer);

  /** Route param. Undefined until the router binds it. */
  readonly slug = input<string | undefined>();

  private readonly post = httpResource<BlogPostFile>(
    () => {
      const slug = this.slug();
      if (!slug || !SAFE_SLUG_RE.test(slug)) {
        return undefined;
      }
      return `content/blog/${slug}.json`;
    },
    {
      parse: (value: unknown): BlogPostFile => {
        if (!isBlogPostFile(value)) {
          throw new Error('Invalid blog post');
        }
        return value;
      },
    }
  );

  /** Waiting keeps the previous note from flashing a 404 during navigation. */
  protected readonly phase = computed((): PostPhase => {
    const slug = this.slug();
    if (slug === undefined) {
      return 'waiting';
    }
    if (!SAFE_SLUG_RE.test(slug)) {
      return 'missing';
    }
    const status = this.post.status();
    if (status === 'error') {
      return 'missing';
    }
    if (status === 'resolved' || status === 'local') {
      return 'ready';
    }
    return 'waiting';
  });

  /** Trusted blocks for the resolved post. Empty until then. */
  protected readonly blocks = computed((): readonly RenderBlock[] => {
    if (this.phase() !== 'ready' || !this.post.hasValue()) {
      return [];
    }
    return this.renderBlocks(this.post.value());
  });

  constructor() {
    effect(() => {
      const phase = this.phase();
      if (phase === 'ready' && this.post.hasValue()) {
        this.seo.setBlogPostSeo(this.post.value());
        return;
      }
      if (phase === 'missing') {
        this.seo.setPageSeo('notFound');
      }
    });
  }

  private renderBlocks(post: BlogPostFile): readonly RenderBlock[] {
    const blocks: RenderBlock[] = [];
    for (const block of post.blocks) {
      if (block.type === 'html') {
        blocks.push({
          type: 'html',
          html: this.sanitizer.bypassSecurityTrustHtml(block.html),
        });
        continue;
      }
      if (block.type === 'image') {
        blocks.push(block);
        continue;
      }
      if (!block.embedUrl.startsWith(FIGMA_EMBED_PREFIX)) {
        continue;
      }
      blocks.push({
        type: 'figma',
        title: block.title,
        src: this.sanitizer.bypassSecurityTrustResourceUrl(block.embedUrl),
      });
    }
    return blocks;
  }
}

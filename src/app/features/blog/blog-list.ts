// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Blog index loaded from prebuilt JSON. */

import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatBlogDate } from '../../core/content/blog/blog-format';
import type { BlogCard } from '../../core/content/blog/blog.models';
import { Seo } from '../../core/seo/seo';
import { OptimizedImage } from '../../shared/optimized-image/optimized-image';

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

/** Dark card index of blog posts. */
@Component({
  selector: 'app-blog-list',
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.scss',
  imports: [RouterLink, OptimizedImage],
})
export class BlogList {
  private readonly seo = inject(Seo);

  private readonly index = httpResource<readonly BlogCard[]>(
    () => 'content/blog/index.json',
    {
      defaultValue: [],
      parse: (value: unknown): readonly BlogCard[] => {
        if (!Array.isArray(value) || !value.every(isBlogCard)) {
          throw new Error('Invalid blog index');
        }
        return value;
      },
    }
  );

  /** True until the index request settles. */
  protected readonly waiting = computed(() => {
    const status = this.index.status();
    return status === 'idle' || status === 'loading' || status === 'reloading';
  });

  /** True when the index request failed. */
  protected readonly failed = computed(() => this.index.status() === 'error');

  /** Published cards. Empty while the index is missing or failed. */
  protected readonly posts = computed(() =>
    this.index.hasValue() ? this.index.value() : []
  );

  constructor() {
    this.seo.setPageSeo('blog');
  }

  protected dateLabel(iso: string): string {
    return formatBlogDate(iso);
  }

  protected categoriesLabel(categories: readonly string[]): string {
    return categories.join(' | ');
  }
}

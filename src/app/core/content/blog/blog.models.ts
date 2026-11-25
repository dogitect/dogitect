// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Blog card, block, and published-post shapes. */

/** Card fields written to `public/content/blog/index.json`. */
export interface BlogCard {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly categories: readonly string[];
  readonly draft: boolean;
  readonly cover?: string;
}

export type BlogBlock =
  | { readonly type: 'html'; readonly html: string }
  | { readonly type: 'image'; readonly path: string; readonly alt: string }
  | {
      readonly type: 'figma';
      readonly embedUrl: string;
      readonly title: string;
    };

/** One post as written to `public/content/blog/<slug>.json`. */
export interface BlogPostFile extends BlogCard {
  readonly blocks: readonly BlogBlock[];
}

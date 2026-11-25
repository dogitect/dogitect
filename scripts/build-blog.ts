#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Compiles content/blog/*.md into a card index and one JSON document per post.
// Set BLOG_INCLUDE_DRAFTS=1 to keep drafts for local preview.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseBlogMarkdown,
  postsForBuild,
  type BlogDocument,
} from './blog-document';
import type {
  BlogCard,
  BlogPostFile,
} from '../src/app/core/content/blog/blog.models';

const SOURCE_DIR = 'content/blog';
const OUTPUT_DIR = 'public/content/blog';
const SITEMAP_PATH = 'public/sitemap.xml';
const SITE = 'https://dogitect.com';
const SITEMAP_START = '<!-- blog:posts -->';
const SITEMAP_END = '<!-- /blog:posts -->';

async function main(): Promise<void> {
  const includeDrafts = process.env['BLOG_INCLUDE_DRAFTS'] === '1';
  const names = (await readdir(SOURCE_DIR))
    .filter((name) => name.endsWith('.md'))
    .sort();

  const documents: BlogDocument[] = [];
  for (const name of names) {
    const source = await readFile(join(SOURCE_DIR, name), 'utf8');
    const document = await parseBlogMarkdown(name, source);
    await assertImagesExist(document);
    documents.push(document);
  }

  const slugs = new Set<string>();
  for (const document of documents) {
    if (slugs.has(document.slug)) {
      throw new Error(`duplicate blog slug "${document.slug}"`);
    }
    slugs.add(document.slug);
  }

  const visible = postsForBuild(documents, includeDrafts);
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const existing of await readdir(OUTPUT_DIR)) {
    if (existing.endsWith('.json') || existing.endsWith('.md')) {
      await rm(join(OUTPUT_DIR, existing));
    }
  }

  await writeFile(
    join(OUTPUT_DIR, 'index.json'),
    `${JSON.stringify(visible.map(toCard), null, 2)}\n`
  );
  for (const document of visible) {
    await writeFile(
      join(OUTPUT_DIR, `${document.slug}.json`),
      `${JSON.stringify(toPostFile(document), null, 2)}\n`
    );
  }

  await updateSitemap(documents.filter((document) => !document.draft));
  console.log(
    `Wrote ${visible.length} blog post(s)${includeDrafts ? ', including drafts' : ''}.`
  );
}

function toPostFile(document: BlogDocument): BlogPostFile {
  return {
    ...toCard(document),
    blocks: document.blocks,
  };
}

function toCard(document: BlogDocument): BlogCard {
  return {
    slug: document.slug,
    title: document.title,
    description: document.description,
    date: document.date,
    categories: document.categories,
    draft: document.draft,
    cover: document.cover,
  };
}

async function assertImagesExist(document: BlogDocument): Promise<void> {
  for (const imagePath of document.imagePaths) {
    const file = Bun.file(join('public', imagePath));
    if (!(await file.exists())) {
      throw new Error(`${document.slug}: image not found: ${imagePath}`);
    }
  }
}

async function updateSitemap(posts: readonly BlogDocument[]): Promise<void> {
  const xml = await readFile(SITEMAP_PATH, 'utf8');
  const start = xml.indexOf(SITEMAP_START);
  const end = xml.indexOf(SITEMAP_END);
  if (start < 0 || end < start) {
    throw new Error('sitemap.xml is missing blog post markers');
  }

  const entries = postsForBuild(posts, false)
    .map(
      (post) => `  <url>
    <loc>${SITE}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');
  const body = entries === '' ? '\n  ' : `\n${entries}\n  `;
  const next = `${xml.slice(0, start + SITEMAP_START.length)}${body}${xml.slice(end)}`;
  if (next !== xml) {
    await writeFile(SITEMAP_PATH, next);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

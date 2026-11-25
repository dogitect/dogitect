// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Turns a blog Markdown file into card fields and render blocks.
 * The blog build script and the content validator both use this module.
 */

import type { Root, RootContent } from 'mdast';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { Schema } from 'hast-util-sanitize';
import type {
  BlogBlock,
  BlogCard,
} from '../src/app/core/content/blog/blog.models';
import { isRealBlogDate } from '../src/app/core/content/blog/blog-format';

const FRONTMATTER_KEYS = new Set([
  'draft',
  'slug',
  'date',
  'title',
  'description',
  'categories',
  'cover',
]);

const FIGMA_HOSTS = new Set(['figma.com', 'www.figma.com']);
const FIGMA_KINDS = new Set([
  'design',
  'file',
  'slides',
  'board',
  'proto',
  'make',
  'site',
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_BLOG_COVER = 'images/blog/default-cover.png';
const REMOVED_TAGS = new Set([
  'img',
  'iframe',
  'script',
  'style',
  'object',
  'embed',
  'form',
]);

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !REMOVED_TAGS.has(tag)
  ),
};

const htmlProcessor = unified()
  .use(remarkRehype)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export interface BlogDocument extends BlogCard {
  readonly blocks: readonly BlogBlock[];
  readonly imagePaths: readonly string[];
}

export interface FigmaEmbed {
  readonly embedUrl: string;
  readonly title: string;
}

/** Rewrites an allowed Figma file URL into an embed URL. `file` maps to `design`. */
export function figmaEmbed(raw: string): FigmaEmbed {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`Invalid Figma URL: ${raw.trim()}`);
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.port !== '' ||
    !FIGMA_HOSTS.has(url.hostname)
  ) {
    throw new Error(`Figma URL is not allowed: ${raw.trim()}`);
  }

  const parts = url.pathname.split('/').filter((part) => part !== '');
  const kind = parts[0] ?? '';
  const key = parts[1] ?? '';
  if (!FIGMA_KINDS.has(kind) || !/^[A-Za-z0-9]+$/.test(key)) {
    throw new Error(`Figma URL is not allowed: ${raw.trim()}`);
  }

  const embedKind = kind === 'file' ? 'design' : kind;
  const embed = new URL(`https://embed.figma.com/${embedKind}/${key}`);
  url.searchParams.forEach((value, name) => {
    if (name !== 'embed-host') {
      embed.searchParams.append(name, value);
    }
  });
  embed.searchParams.set('embed-host', 'dogitect');
  embed.searchParams.set('theme', 'dark');
  embed.searchParams.set('footer', 'false');
  embed.searchParams.set('page-selector', 'false');
  embed.searchParams.set('hide-ui', '1');

  const name = parts.slice(2).join(' ');
  let title = 'Figma';
  if (name !== '') {
    try {
      title = decodeURIComponent(name).replace(/-/g, ' ');
    } catch {
      throw new Error(`Figma URL is not allowed: ${raw.trim()}`);
    }
  }

  return { embedUrl: embed.toString(), title };
}

/** Logical PNG path for one post. Anything else is rejected. */
export function blogImagePath(slug: string, raw: string): string {
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    throw new Error(`Invalid image path: ${raw.trim()}`);
  }
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  const prefix = `images/blog/${slug}/`;
  const name = path.startsWith(prefix) ? path.slice(prefix.length) : '';
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(name) || path.includes('..')) {
    throw new Error(
      `Image must be ${prefix}<name>.png, received "${raw.trim()}"`
    );
  }
  return path;
}

/** Drops drafts unless local preview asked for them, then sorts newest first. */
export function postsForBuild<T extends BlogCard>(
  posts: readonly T[],
  includeDrafts: boolean
): T[] {
  const visible = includeDrafts
    ? [...posts]
    : posts.filter((post) => !post.draft);
  return visible.sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
  );
}

/** Parses one Markdown file. `filename` is the basename, including `.md`. */
export async function parseBlogMarkdown(
  filename: string,
  source: string
): Promise<BlogDocument> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match?.[1]) {
    throw new Error(`${filename}: missing frontmatter`);
  }

  const data = parseFrontmatter(filename, match[1]);
  const slug = requireSlug(filename, data['slug']);
  if (filename !== `${slug}.md`) {
    throw new Error(`${filename}: filename must match slug "${slug}"`);
  }

  const title = requireText(filename, data, 'title');
  const description = requireText(filename, data, 'description');
  const date = requireDate(filename, data['date']);
  const categories = requireCategories(filename, data['categories']);
  const draft = requireDraft(filename, data['draft']);
  const cover =
    data['cover'] === undefined
      ? DEFAULT_BLOG_COVER
      : blogImagePath(slug, requireText(filename, data, 'cover'));

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(source.slice(match[0].length));
  assertPlacement(filename, tree);
  const blocks = await renderBlocks(filename, slug, tree);
  const imagePaths = [
    ...(cover ? [cover] : []),
    ...blocks
      .filter(
        (block): block is Extract<BlogBlock, { type: 'image' }> =>
          block.type === 'image'
      )
      .map((block) => block.path),
  ];

  return {
    slug,
    title,
    description,
    date,
    categories,
    draft,
    cover,
    blocks,
    imagePaths,
  };
}

function parseFrontmatter(
  filename: string,
  block: string
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = block.split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const matched = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!matched?.[1]) {
      throw new Error(`${filename}: invalid frontmatter line "${line}"`);
    }
    const key = matched[1];
    if (!FRONTMATTER_KEYS.has(key)) {
      throw new Error(`${filename}: unknown frontmatter field "${key}"`);
    }
    if (data[key] !== undefined) {
      throw new Error(`${filename}: duplicate frontmatter field "${key}"`);
    }

    const rest = matched[2] ?? '';
    if (rest === '') {
      const items: string[] = [];
      index += 1;
      while (index < lines.length && /^\s*-\s+\S/.test(lines[index] ?? '')) {
        items.push(unquote((lines[index] ?? '').replace(/^\s*-\s+/, '')));
        index += 1;
      }
      if (items.length === 0) {
        throw new Error(`${filename}: "${key}" needs one or more items`);
      }
      data[key] = items;
      continue;
    }

    data[key] =
      rest === 'true' ? true : rest === 'false' ? false : unquote(rest);
    index += 1;
  }

  return data;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function requireText(
  filename: string,
  data: Record<string, unknown>,
  key: string
): string {
  const value = data[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${filename}: "${key}" must be a non-empty string`);
  }
  return value.trim();
}

function requireSlug(filename: string, value: unknown): string {
  if (typeof value !== 'string' || !SLUG_RE.test(value)) {
    throw new Error(
      `${filename}: "slug" must be a lowercase kebab-case string`
    );
  }
  return value;
}

function requireDate(filename: string, value: unknown): string {
  if (typeof value !== 'string' || !isRealBlogDate(value)) {
    throw new Error(`${filename}: "date" must be a real YYYY-MM-DD day`);
  }
  return value;
}

function requireCategories(filename: string, value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    throw new Error(`${filename}: "categories" must list one or more labels`);
  }
  return value.map((item) => item.trim());
}

function requireDraft(filename: string, value: unknown): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${filename}: "draft" must be true or false`);
  }
  return value;
}

function assertPlacement(filename: string, tree: Root): void {
  for (const node of tree.children) {
    if (node.type === 'code' && node.lang === 'figma') {
      continue;
    }
    if (node.type === 'paragraph') {
      const images = node.children.filter((child) => child.type === 'image');
      if (images.length > 0 && images.length !== node.children.length) {
        throw new Error(`${filename}: each image must be its own paragraph`);
      }
      continue;
    }
    if (containsImage(node)) {
      throw new Error(`${filename}: each image must be its own paragraph`);
    }
    if (containsFigma(node)) {
      throw new Error(`${filename}: a Figma embed must be its own block`);
    }
  }
}

function containsImage(node: RootContent): boolean {
  if (node.type === 'image') {
    return true;
  }
  if (!('children' in node)) {
    return false;
  }
  return node.children.some((child) => containsImage(child as RootContent));
}

function containsFigma(node: RootContent): boolean {
  if (node.type === 'code' && node.lang === 'figma') {
    return true;
  }
  if (!('children' in node)) {
    return false;
  }
  return node.children.some((child) => containsFigma(child as RootContent));
}

async function renderBlocks(
  filename: string,
  slug: string,
  tree: Root
): Promise<BlogBlock[]> {
  const blocks: BlogBlock[] = [];
  let prose: RootContent[] = [];

  const flush = async (): Promise<void> => {
    const html = await renderHtml(prose);
    prose = [];
    if (html !== '') {
      blocks.push({ type: 'html', html });
    }
  };

  for (const node of tree.children) {
    if (node.type === 'code' && node.lang === 'figma') {
      await flush();
      const lines = node.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');
      if (lines.length !== 1) {
        throw new Error(`${filename}: a Figma embed must be a single URL`);
      }
      blocks.push({ type: 'figma', ...figmaEmbed(lines[0] ?? '') });
      continue;
    }

    if (
      node.type === 'paragraph' &&
      node.children.length > 0 &&
      node.children.every((child) => child.type === 'image')
    ) {
      await flush();
      for (const child of node.children) {
        if (child.type !== 'image') {
          continue;
        }
        blocks.push({
          type: 'image',
          path: blogImagePath(slug, child.url),
          alt: child.alt ?? '',
        });
      }
      continue;
    }

    prose.push(node);
  }

  await flush();
  return blocks;
}

async function renderHtml(nodes: RootContent[]): Promise<string> {
  if (nodes.length === 0) {
    return '';
  }
  const root: Root = { type: 'root', children: nodes };
  const transformed = await htmlProcessor.run(root);
  return String(htmlProcessor.stringify(transformed)).trim();
}

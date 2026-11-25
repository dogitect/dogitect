#!/usr/bin/env bun
// Copyright 2026 Leon Xia. MIT License.
// Checks authored content and the images and PDFs it references.
// Usage: bun run validate-content

import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  projectPdfPath,
  projectStillPath,
} from '../src/app/core/images/image-delivery';
import { parseBlogMarkdown } from './blog-document';
import { readInsightSource } from './insights-source';

const PUBLIC_DIR = 'public';
const BLOG_DIR = 'content/blog';
const IMAGES_DIR = join(PUBLIC_DIR, 'images');
const DOCUMENTS_DIR = join(PUBLIC_DIR, 'documents');
const MAX_PDF_BYTES = 100 * 1024 * 1024;
const REQUIRED_IMAGES = [
  'images/bg.png',
  'images/social-preview.png',
  'images/logo.png',
  'images/about.jpg',
];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg']);
const DISALLOWED_EXTENSIONS = new Set(['.jpeg', '.avif', '.webp', '.gif']);

const errors: string[] = [];

function error(msg: string): void {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

/** Resolves a public-relative path and rejects traversal. */
function resolvePublicPath(relativePath: string, label: string): string | null {
  if (
    relativePath.startsWith('/') ||
    relativePath.split('/').some((part) => part === '..' || part === '')
  ) {
    error(`${label}: image path escapes public/: ${relativePath}`);
    return null;
  }
  return join(PUBLIC_DIR, relativePath);
}

async function validateRequiredImages(): Promise<void> {
  console.log('\nValidating required images...');
  for (const imagePath of REQUIRED_IMAGES) {
    const before = errors.length;
    await validateReferencedImage(imagePath, 'required image');
    if (errors.length === before) {
      ok(imagePath);
    }
  }
}

async function validateReferencedImage(
  imagePath: string,
  label: string
): Promise<void> {
  if (!imagePath.endsWith('.png') && !imagePath.endsWith('.jpg')) {
    error(`${label}: image must be a PNG or JPG: ${imagePath}`);
  }
  const file = resolvePublicPath(imagePath, label);
  if (!file) {
    return;
  }
  if (!(await Bun.file(file).exists())) {
    error(`${label}: image not found: ${imagePath}`);
  }
}

async function validateInsights(): Promise<readonly string[] | null> {
  console.log('\nValidating projects.json...');
  const source = await readInsightSource();
  for (const message of source.errors) {
    error(message);
  }
  if (!source.projects) {
    return null;
  }
  ok(`projects.json has ${source.projects.length} cases`);

  console.log('\nValidating case metadata...');
  for (const project of source.projects) {
    const before = errors.length;
    const metadataFailed = source.errors.some(
      (message) =>
        message.startsWith(`${project}:`) || message.startsWith(`${project}/`)
    );
    await validateReferencedImage(projectStillPath(project), project);
    await validateReferencedPdf(projectPdfPath(project), project);
    if (!metadataFailed && errors.length === before) {
      ok(`${project}/metadata.json`);
    }
  }

  const directoryFailed = source.errors.some(
    (message) =>
      message === 'insights content directory not found' ||
      message.endsWith('not listed in projects.json') ||
      message.endsWith('no directory found')
  );
  if (!directoryFailed) {
    ok('Directory cross-check complete');
  }
  return source.projects;
}

async function validateReferencedPdf(
  pdfPath: string,
  label: string
): Promise<void> {
  if (!pdfPath.endsWith('.pdf')) {
    error(`${label}: document must be a PDF: ${pdfPath}`);
  }
  const file = resolvePublicPath(pdfPath, label);
  if (!file) {
    return;
  }
  if (!(await Bun.file(file).exists())) {
    error(`${label}: PDF not found: ${pdfPath}`);
  }
}

async function validateCaseLibraries(
  projects: readonly string[]
): Promise<void> {
  console.log('\nValidating case stills and PDFs...');
  const before = errors.length;

  await expectExactFiles(
    join(IMAGES_DIR, 'insights'),
    new Set(projects.map((project) => `${project}.png`)),
    'case stills'
  );
  await expectExactFiles(
    join(DOCUMENTS_DIR, 'insights'),
    new Set(projects.map((project) => `${project}.pdf`)),
    'case PDFs'
  );

  if (errors.length === before) {
    ok('Case stills and PDFs match projects.json');
  }
}

async function expectExactFiles(
  dir: string,
  expected: Set<string>,
  label: string
): Promise<void> {
  if (!(await dirExists(dir))) {
    error(`${label}: directory not found: ${dir}`);
    return;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const actual = new Set<string>();
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (entry.isDirectory()) {
      error(`${label}: unexpected directory ${entry.name}`);
      continue;
    }
    if (entry.isFile()) {
      actual.add(entry.name);
    }
  }

  for (const name of expected) {
    if (!actual.has(name)) {
      error(`${label}: missing ${name}`);
    }
  }
  for (const name of actual) {
    if (!expected.has(name)) {
      error(`${label}: unexpected file ${name}`);
    }
  }
}

async function validateImageLibrary(): Promise<void> {
  console.log('\nValidating image library...');
  const files = await walkFiles(IMAGES_DIR);
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    if (DISALLOWED_EXTENSIONS.has(extension)) {
      error(`image library: ${file} must be a PNG or JPG`);
      continue;
    }
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }
    const info = await stat(file);
    if (info.size > MAX_IMAGE_BYTES) {
      error(
        `image library: ${file} is ${info.size} bytes, over the 25MB limit`
      );
    }
  }
  ok('Image library checked');
}

async function validateDocumentLibrary(): Promise<void> {
  console.log('\nValidating document library...');
  const files = await walkFiles(DOCUMENTS_DIR);
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    if (extension !== '.pdf') {
      error(`document library: ${file} must be a PDF`);
      continue;
    }
    const info = await stat(file);
    if (info.size > MAX_PDF_BYTES) {
      error(
        `document library: ${file} is ${info.size} bytes, over the 100MB limit`
      );
    }
  }
  ok('Document library checked');
}

async function walkFiles(dir: string): Promise<string[]> {
  if (!(await dirExists(dir))) {
    return [];
  }
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

async function validateBlog(): Promise<void> {
  console.log('\nValidating blog posts...');
  if (!(await dirExists(BLOG_DIR))) {
    error('content/blog directory not found');
    return;
  }

  const entries = await readdir(BLOG_DIR, { withFileTypes: true });
  const slugs = new Set<string>();
  const before = errors.length;
  let count = 0;
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      error(`content/blog/${entry.name}: only Markdown posts are allowed`);
      continue;
    }

    try {
      const source = await Bun.file(join(BLOG_DIR, entry.name)).text();
      const document = await parseBlogMarkdown(entry.name, source);
      if (slugs.has(document.slug)) {
        error(`content/blog: duplicate slug "${document.slug}"`);
      }
      slugs.add(document.slug);
      for (const imagePath of document.imagePaths) {
        if (!(await Bun.file(join(PUBLIC_DIR, imagePath)).exists())) {
          error(`${document.slug}: image not found: ${imagePath}`);
        }
      }
      count += 1;
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  }

  if (errors.length === before) {
    ok(`${count} blog post(s) checked`);
  }
}

async function main(): Promise<void> {
  await validateRequiredImages();
  await validateImageLibrary();
  await validateDocumentLibrary();

  const projects = await validateInsights();
  if (!projects) {
    console.error(`\n✗ ${errors.length} validation error(s) found.\n`);
    process.exit(1);
  }

  await validateCaseLibraries(projects);
  await validateBlog();

  console.log('');
  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} validation error(s) found.\n`);
    process.exit(1);
  }
  console.log('\n✓ All content validations passed.\n');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

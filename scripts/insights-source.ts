// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Reads authored insight cases from `content/insights`.
 * The build script writes the result. The content validator reports the errors.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  projectPdfPath,
  projectStillPath,
} from '../src/app/core/images/image-delivery';
import type { InsightCase } from '../src/app/features/insights/insights.models';

const SOURCE_DIR = 'content/insights';
const SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const DATE_RE = /^\d{4}-\d{2}$/;

export interface InsightSource {
  /** Slugs in authored order. `null` when `projects.json` cannot be read. */
  readonly projects: readonly string[] | null;
  /** Cases whose metadata is complete. Omitted when that case has an error. */
  readonly cases: readonly InsightCase[];
  readonly errors: readonly string[];
}

export async function readInsightSource(
  sourceDir = SOURCE_DIR
): Promise<InsightSource> {
  const errors: string[] = [];
  const projectsPath = join(sourceDir, 'projects.json');
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(projectsPath, 'utf8')) as unknown;
  } catch (err) {
    errors.push(
      isMissingFile(err)
        ? 'projects.json not found'
        : `projects.json: ${errorText(err)}`
    );
    return { projects: null, cases: [], errors };
  }

  if (!isRecord(raw) || !Array.isArray(raw['projects'])) {
    errors.push('projects.json: "projects" must be an array');
    return { projects: null, cases: [], errors };
  }
  if ('categories' in raw) {
    errors.push('projects.json: remove "categories"; cases are a flat list');
  }

  const projects: string[] = [];
  const slugs = new Set<string>();
  for (const [index, project] of raw['projects'].entries()) {
    const label = `projects.json projects[${index}]`;
    if (typeof project !== 'string' || !SLUG_RE.test(project)) {
      errors.push(`${label}: slug must be a URL-safe string`);
      continue;
    }
    if (slugs.has(project)) {
      errors.push(`${label}: duplicate case slug "${project}"`);
    }
    slugs.add(project);
    projects.push(project);
  }

  const cases: InsightCase[] = [];
  for (const slug of projects) {
    const item = await readCase(sourceDir, slug, errors);
    if (item) {
      cases.push(item);
    }
  }

  await checkDirectories(sourceDir, projects, errors);
  return { projects, cases, errors };
}

async function readCase(
  sourceDir: string,
  slug: string,
  errors: string[]
): Promise<InsightCase | null> {
  const metaPath = join(sourceDir, slug, 'metadata.json');
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(metaPath, 'utf8')) as unknown;
  } catch (err) {
    errors.push(
      isMissingFile(err)
        ? `${slug}/metadata.json not found`
        : `${slug}/metadata.json: ${errorText(err)}`
    );
    return null;
  }
  if (!isRecord(raw)) {
    errors.push(`${slug}/metadata.json: expected an object`);
    return null;
  }

  const title = requireText(raw, 'title', slug, errors);
  const subtitle = requireText(raw, 'subtitle', slug, errors);
  const description = requireText(raw, 'description', slug, errors);
  const date = requireText(raw, 'date', slug, errors);
  if (date !== undefined && !DATE_RE.test(date)) {
    errors.push(`${slug}: invalid date "${date}" (expected YYYY-MM)`);
  }
  if ('slideCount' in raw) {
    errors.push(`${slug}: remove "slideCount"; the case is a PDF, not slides`);
  }
  if (
    title === undefined ||
    subtitle === undefined ||
    description === undefined ||
    date === undefined ||
    !DATE_RE.test(date)
  ) {
    return null;
  }

  return {
    slug,
    title,
    subtitle,
    description,
    date,
    imagePath: projectStillPath(slug),
    pdfPath: projectPdfPath(slug),
  };
}

function requireText(
  record: Record<string, unknown>,
  field: string,
  label: string,
  errors: string[]
): string | undefined {
  const value = record[field];
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label}: missing or empty "${field}"`);
    return undefined;
  }
  return value;
}

async function checkDirectories(
  sourceDir: string,
  projects: readonly string[],
  errors: string[]
): Promise<void> {
  if (!(await dirExists(sourceDir))) {
    errors.push('insights content directory not found');
    return;
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const dir of dirs) {
    if (!projects.includes(dir)) {
      errors.push(
        `${dir}: directory exists but is not listed in projects.json`
      );
    }
  }
  for (const project of projects) {
    if (!dirs.includes(project)) {
      errors.push(`${project}: listed in projects.json but no directory found`);
    }
  }
}

function isMissingFile(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'ENOENT'
  );
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

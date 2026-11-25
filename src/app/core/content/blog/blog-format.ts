// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Blog date formatting. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a validated `YYYY-MM-DD` date for the card and the reader. */
export function formatBlogDate(iso: string): string {
  if (!DATE_RE.test(iso)) {
    return iso;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return iso;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function isRealBlogDate(iso: string): boolean {
  if (!DATE_RE.test(iso)) {
    return false;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

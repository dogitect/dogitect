// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Reduced-motion preference. */

/** Checks if the user prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

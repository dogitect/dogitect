// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Sends a GA4 page view after client-side navigation. */

/** Sends one GA4 page view for a client-side navigation. */
export function trackPageView(path: string): void {
  const gtag = (globalThis as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') {
    return;
  }

  const origin = globalThis.location?.origin ?? 'https://dogitect.com';
  gtag('event', 'page_view', {
    page_path: path,
    page_location: `${origin}${path}`,
  });
}

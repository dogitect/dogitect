// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Canonical host and path for a request URL.
 * `www` goes to the apex, and a trailing slash is removed, in one redirect.
 * `/` is already canonical. Query and hash stay on the URL object.
 */

const APEX_HOST = 'dogitect.com';
const WWW_HOST = 'www.dogitect.com';

export function canonicalRequestUrl(url: URL): URL | null {
  const canonical = new URL(url);
  let changed = false;

  if (canonical.hostname.toLowerCase() === WWW_HOST) {
    canonical.hostname = APEX_HOST;
    canonical.protocol = 'https:';
    changed = true;
  }

  if (canonical.pathname.length > 1 && canonical.pathname.endsWith('/')) {
    const stripped = canonical.pathname.replace(/\/+$/, '');
    canonical.pathname = stripped === '' ? '/' : stripped;
    changed = true;
  }

  return changed ? canonical : null;
}

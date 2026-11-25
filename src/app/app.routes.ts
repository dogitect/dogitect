// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Lazy route definitions. */

import type { Routes, ResolveFn } from '@angular/router';

// Provides an initial readable title for a blog route before its metadata loads.
const blogTitleResolver: ResolveFn<string> = (route) => {
  const slug = route.paramMap.get('slug') ?? '';
  if (!slug) {
    return 'Blog | dogitect';
  }
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return `${label} | dogitect`;
};

// Provides an initial readable title for a case route before its metadata loads.
const workDetailTitleResolver: ResolveFn<string> = (route) => {
  const slug = route.paramMap.get('slug') ?? '';
  if (!slug) {
    return 'Insights | dogitect';
  }
  const label = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return `${label} | dogitect`;
};

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'dogitect — Independent AI and cloud solutions architect',
    // Empty `children` makes `/` a valid match without a routed component.
    // The home page is rendered by the shell (hero background) in `app.html`.
    children: [],
  },
  {
    path: 'insights',
    loadComponent: () =>
      import('./features/insights/insights').then((m) => m.Insights),
    title: 'Insights | dogitect',
    data: { preload: true },
  },
  {
    path: 'insights/:slug',
    loadComponent: () =>
      import('./features/insights/insights').then((m) => m.Insights),
    title: workDetailTitleResolver,
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
    title: 'About | dogitect',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact').then((m) => m.Contact),
    title: 'Contact | dogitect',
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/blog-list').then((m) => m.BlogList),
    title: 'Blog | dogitect',
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./features/blog/blog-post').then((m) => m.BlogPost),
    title: blogTitleResolver,
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then((m) => m.NotFound),
    title: '404 | dogitect',
  },
];

// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Root component: route-based shell with conditional layout. */

import {
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { trackPageView } from './core/analytics/page-view';
import { Seo } from './core/seo/seo';
import { Footer } from './layout/footer/footer';
import { HeroBackground } from './layout/hero-background/hero-background';
import { Navigation } from './layout/navigation/navigation';

/** Root application component with route-based conditional layout. */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [RouterOutlet, Navigation, HeroBackground, Footer],
})
export class App {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly seoService = inject(Seo);
  private trackedPath = '';

  /** Current route URL as signal, initialized from browser location. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.getInitialUrl())
    )
  );

  /** Whether to show the hero background (only on home page). */
  protected readonly showHeroBackground = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '';
  });

  /** Whether to show the footer (hide on home page). */
  protected readonly showFooter = computed(
    () => (this.currentUrl() ?? '/') !== '/'
  );

  constructor() {
    effect(() => {
      const url = this.currentUrl();
      if (url === '/' || url === '') {
        this.seoService.setPageSeo('home');
      }
    });

    effect(() => {
      const url = this.currentUrl();
      if (!url || !isPlatformBrowser(this.platformId)) {
        return;
      }
      const path = url.split('?')[0] || '/';
      if (path === this.trackedPath) {
        return;
      }
      this.trackedPath = path;
      trackPageView(path);
    });
  }

  /** Reads the URL before the first NavigationEnd. */
  private getInitialUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return this.document.location.pathname;
    }
    return this.router.url;
  }
}

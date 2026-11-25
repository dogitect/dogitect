// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Viewport breakpoint signals. */

import {
  Service,
  computed,
  signal,
  inject,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Device categories derived from viewport width. */
export type DeviceType = 'phone' | 'tablet' | 'desktop';

const CUSTOM_BREAKPOINTS = {
  Phone: '(max-width: 767.98px)',
  Tablet: '(min-width: 768px) and (max-width: 1024px)',
  Desktop: '(min-width: 1024.01px)',
} as const;

/** Detects viewport breakpoint changes using native MediaQueryList API. */
@Service()
export class Breakpoint {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isPhoneSource = signal(false);
  private readonly isTabletSource = signal(false);
  private readonly isDesktopSource = signal(false);

  readonly isPhone = this.isPhoneSource.asReadonly();
  readonly isTablet = this.isTabletSource.asReadonly();
  readonly isDesktop = this.isDesktopSource.asReadonly();

  readonly isMobile = computed(
    () => this.isPhoneSource() || this.isTabletSource()
  );

  readonly deviceType = computed<DeviceType>(() => {
    if (this.isPhoneSource()) {
      return 'phone';
    }
    if (this.isTabletSource()) {
      return 'tablet';
    }
    return 'desktop';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeBreakpoints();
    }
  }

  /** Initializes media query listeners for all breakpoints. */
  private initializeBreakpoints(): void {
    const phoneQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Phone);
    this.isPhoneSource.set(phoneQuery.matches);
    const phoneHandler = (e: MediaQueryListEvent): void =>
      this.isPhoneSource.set(e.matches);
    phoneQuery.addEventListener('change', phoneHandler);

    const tabletQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Tablet);
    this.isTabletSource.set(tabletQuery.matches);
    const tabletHandler = (e: MediaQueryListEvent): void =>
      this.isTabletSource.set(e.matches);
    tabletQuery.addEventListener('change', tabletHandler);

    const desktopQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Desktop);
    this.isDesktopSource.set(desktopQuery.matches);
    const desktopHandler = (e: MediaQueryListEvent): void =>
      this.isDesktopSource.set(e.matches);
    desktopQuery.addEventListener('change', desktopHandler);

    this.destroyRef.onDestroy(() => {
      phoneQuery.removeEventListener('change', phoneHandler);
      tabletQuery.removeEventListener('change', tabletHandler);
      desktopQuery.removeEventListener('change', desktopHandler);
    });
  }
}

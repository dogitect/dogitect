// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Insights page. Desktop stacks one case per viewport.
 * Phones use a normal document so each case can be read by scrolling.
 */

import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { DocumentDelivery } from '../../core/images/document-delivery';
import { Breakpoint } from '../../core/breakpoint/breakpoint';
import { Seo } from '../../core/seo/seo';
import { OptimizedImage } from '../../shared/optimized-image/optimized-image';
import { computeStackedCardStyles } from './card-animation';
import type { InsightCase } from './insights.models';
import { InsightsStore } from './insights-store';
import { prefersReducedMotion } from './motion';
import { setupScrollListener } from './scroll-listener';

const SAFE_SLUG_RE = /^[a-zA-Z0-9_-]+$/;
const KEYBOARD_SCROLL_MS = 680;
/** Quiet time after a card slide. A second press in this window does not advance. */
const KEYBOARD_GAP_MS = 480;

/** Full-screen case list for the insights page. */
@Component({
  selector: 'app-insights',
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
  imports: [OptimizedImage],
})
export class Insights {
  /** Route param. Undefined on `/insights` and until the router binds it. */
  protected readonly slug = input<string | undefined>();
  private readonly router = inject(Router);
  private readonly store = inject(InsightsStore);
  private readonly documents = inject(DocumentDelivery);
  private readonly seo = inject(Seo);
  private readonly breakpoints = inject(Breakpoint);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private readonly contentReady = signal(false);
  private stopStackInteraction: (() => void) | null = null;

  protected readonly isPhone = this.breakpoints.isPhone;
  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly cases = computed(() =>
    this.store.cases.hasValue() ? this.store.cases.value() : []
  );
  protected readonly activeIndex = signal(0);
  protected readonly cardAnimationIndex = signal(0);
  protected readonly scrollProgress = signal(0);

  protected readonly totalCases = computed(() => this.cases().length);

  protected readonly cardStyles = computed(() =>
    computeStackedCardStyles(
      this.totalCases(),
      this.cardAnimationIndex(),
      this.scrollProgress()
    )
  );

  protected readonly formattedDates = computed(() => {
    const map = new Map<string, string>();
    for (const item of this.cases()) {
      map.set(item.slug, this.formatDate(item.date));
    }
    return map;
  });

  constructor() {
    effect(() => {
      const status = this.store.cases.status();
      if (status !== 'resolved' && status !== 'local') {
        return;
      }
      const cases = this.store.cases.value();
      const slug = this.slug();
      untracked(() => this.syncFromRoute(slug, cases));
    });

    effect(() => {
      const phone = this.breakpoints.isPhone();
      if (!this.contentReady()) {
        return;
      }
      untracked(() => {
        queueMicrotask(() => {
          if (this.destroyRef.destroyed) {
            return;
          }
          this.bindInteraction(phone);
        });
      });
    });
  }

  private syncFromRoute(
    slug: string | undefined,
    cases: readonly InsightCase[]
  ): void {
    if (slug && !SAFE_SLUG_RE.test(slug)) {
      void this.router.navigate(['/insights']);
      return;
    }

    const index = slug ? cases.findIndex((item) => item.slug === slug) : 0;
    if (slug && index < 0) {
      void this.router.navigate(['/insights']);
      return;
    }

    if (cases.length === 0) {
      this.seo.setPageSeo('insights');
      return;
    }

    const active = Math.max(index, 0);
    this.activeIndex.set(active);
    this.cardAnimationIndex.set(active);

    const selected = slug ? cases[active] : undefined;
    if (selected) {
      this.seo.setCaseSeo(selected);
    } else {
      this.seo.setPageSeo('insights');
    }

    const alreadyReady = this.contentReady();
    this.contentReady.set(true);
    if (alreadyReady) {
      this.scheduleScroll(this.breakpoints.isPhone());
    }
  }

  private bindInteraction(phone: boolean): void {
    this.stopStackInteraction?.();
    this.stopStackInteraction = null;

    if (!phone) {
      const stopScroll = setupScrollListener({
        totalItems: this.totalCases,
        state: {
          activeIndex: this.activeIndex,
          cardAnimationIndex: this.cardAnimationIndex,
          scrollProgress: this.scrollProgress,
        },
        destroyRef: this.destroyRef,
      });
      const stopKeys = this.setupKeyboardNavigation();
      this.stopStackInteraction = () => {
        stopScroll();
        stopKeys();
      };
    }

    this.scheduleScroll(phone);
  }

  private scheduleScroll(phone: boolean): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    view.requestAnimationFrame(() => {
      if (phone) {
        this.scrollPhoneCaseIntoView();
        return;
      }
      this.scrollStackToActive();
    });
  }

  private scrollPhoneCaseIntoView(): void {
    const slug = this.slug();
    if (!slug) {
      return;
    }
    this.document.getElementById(`insight-${slug}`)?.scrollIntoView({
      behavior: 'instant',
      block: 'start',
    });
  }

  private scrollStackToActive(): void {
    const view = this.document.defaultView;
    const slug = this.slug();
    const active = this.activeIndex();
    if (!view || !slug || active <= 0) {
      return;
    }
    view.scrollTo({
      top: active * view.innerHeight,
      behavior: 'instant',
    });
  }

  private setupKeyboardNavigation(): () => void {
    const defaultView = this.document.defaultView;
    if (!defaultView) {
      return () => undefined;
    }

    let frame = 0;
    let lockedUntil = 0;

    const stop = (): void => {
      if (frame !== 0) {
        defaultView.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const go = (direction: number): void => {
      if (performance.now() < lockedUntil) {
        return;
      }

      const total = this.totalCases();
      const next = this.cardAnimationIndex() + direction;
      if (next < 0 || next >= total) {
        return;
      }

      lockedUntil = performance.now() + KEYBOARD_SCROLL_MS + KEYBOARD_GAP_MS;
      const top = next * defaultView.innerHeight;
      const from = defaultView.scrollY;
      const distance = top - from;
      if (prefersReducedMotion() || Math.abs(distance) <= 1) {
        defaultView.scrollTo({ top, behavior: 'instant' });
        return;
      }

      const started = performance.now();
      const tick = (now: number): void => {
        const progress = Math.min(1, (now - started) / KEYBOARD_SCROLL_MS);
        const eased = 1 - (1 - progress) ** 3;
        defaultView.scrollTo({
          top: from + distance * eased,
          behavior: 'instant',
        });
        if (progress < 1) {
          frame = defaultView.requestAnimationFrame(tick);
          return;
        }
        defaultView.scrollTo({ top, behavior: 'instant' });
        frame = 0;
      };
      frame = defaultView.requestAnimationFrame(tick);
    };

    const onWheel = (): void => {
      lockedUntil = 0;
      stop();
    };

    const moveFromKey = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const direction =
        event.key === 'ArrowDown' || event.key === 'j'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'k'
            ? -1
            : 0;
      if (direction === 0) {
        return;
      }

      event.preventDefault();
      go(direction);
    };

    const detach = (): void => {
      stop();
      defaultView.removeEventListener('keydown', moveFromKey);
      defaultView.removeEventListener('wheel', onWheel);
    };

    defaultView.addEventListener('keydown', moveFromKey);
    defaultView.addEventListener('wheel', onWheel, { passive: true });

    this.destroyRef.onDestroy(detach);
    return detach;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr || !/^\d{4}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const [year, month] = dateStr.split('-');
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return dateStr;
    }

    return new Date(yearNum, monthNum - 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  }

  protected isCardVisible(index: number): boolean {
    const active = this.activeIndex();
    return index >= active - 1 && index <= active + 1;
  }

  protected pdfHref(item: InsightCase): string {
    return this.documents.url(item.pdfPath);
  }
}

// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Scroll-driven index updates with rAF throttling. */

import type { DestroyRef, Signal, WritableSignal } from '@angular/core';

/** Scroll state signals updated by the scroll listener. */
export interface ScrollIndexState {
  readonly activeIndex: WritableSignal<number>;
  readonly cardAnimationIndex: WritableSignal<number>;
  readonly scrollProgress: WritableSignal<number>;
}

/** Configuration for the scroll-driven card index listener. */
export interface ScrollListenerConfig {
  readonly totalItems: Signal<number>;
  readonly state: ScrollIndexState;
  readonly destroyRef: DestroyRef;
}

/** Threshold for switching the active indicator dot (0–1). */
const INDICATOR_SWITCH_THRESHOLD = 0.5;

/** Minimum progress delta before publishing a new value (avoids CD churn). */
const PROGRESS_EPSILON = 1e-3;

/** Updates `target` only when the new value differs, avoiding redundant CD. */
function setIfChanged<T>(target: WritableSignal<T>, value: T): void {
  if (target() !== value) {
    target.set(value);
  }
}

/**
 * Maps vertical scroll position to card indices.
 * `requestAnimationFrame` throttles updates. Each signal is written only when
 * its value changes.
 *
 * A fast fling can move the page while a frame is applying card styles, and
 * the scroll event for the final position is then dropped. The loop keeps
 * reading until the position is stable for one frame, and `scrollend` starts
 * that check again when momentum finishes.
 *
 * @param config Listener configuration (signals and lifecycle hook).
 * @returns Stops the listener. Destroying the caller stops it as well.
 */
export function setupScrollListener(config: ScrollListenerConfig): () => void {
  let frame = 0;
  let lastProgress = -1;
  let lastScrollTop = Number.NaN;
  let lastViewportHeight = -1;

  const updateScroll = (): void => {
    frame = 0;
    const viewportHeight = window.innerHeight;
    const total = config.totalItems();
    const rawIndex = viewportHeight > 0 ? window.scrollY / viewportHeight : 0;
    const baseIndex = Math.floor(rawIndex);
    const progress = rawIndex - baseIndex;

    const cardIndex = Math.min(Math.max(baseIndex, 0), Math.max(total - 1, 0));
    const indicatorIndex = Math.min(
      Math.max(
        progress > INDICATOR_SWITCH_THRESHOLD ? baseIndex + 1 : baseIndex,
        0
      ),
      Math.max(total - 1, 0)
    );
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    const progressChanged =
      Math.abs(clampedProgress - lastProgress) > PROGRESS_EPSILON;
    if (
      config.state.activeIndex() !== indicatorIndex ||
      config.state.cardAnimationIndex() !== cardIndex ||
      progressChanged
    ) {
      setIfChanged(config.state.activeIndex, indicatorIndex);
      setIfChanged(config.state.cardAnimationIndex, cardIndex);
      if (progressChanged) {
        config.state.scrollProgress.set(clampedProgress);
        lastProgress = clampedProgress;
      }
    }

    const scrollTop = window.scrollY;
    const height = window.innerHeight;
    if (scrollTop !== lastScrollTop || height !== lastViewportHeight) {
      lastScrollTop = scrollTop;
      lastViewportHeight = height;
      schedule();
    }
  };

  const schedule = (): void => {
    if (frame !== 0) {
      return;
    }
    frame = window.requestAnimationFrame(updateScroll);
  };

  let stopped = false;
  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    if (frame !== 0) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('scrollend', schedule);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('scrollend', schedule, { passive: true });
  updateScroll();

  config.destroyRef.onDestroy(stop);
  return stop;
}

// Copyright 2026 Leon Xia. MIT License.

import { signal, type DestroyRef, type WritableSignal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupScrollListener } from './scroll-listener';

describe('setupScrollListener', () => {
  const frames: FrameRequestCallback[] = [];
  let scrollY = 0;
  const cleanups: (() => void)[] = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
    frames.length = 0;
    vi.unstubAllGlobals();
  });

  it('follows a fling that lands while the previous frame is rendering', () => {
    const state = listen();
    scrollY = 100;
    window.dispatchEvent(new Event('scroll'));
    const original = state.cardAnimationIndex.set.bind(
      state.cardAnimationIndex
    );
    state.cardAnimationIndex.set = (value: number) => {
      original(value);
      scrollY = 300;
    };
    flush();

    expect(state.cardAnimationIndex()).toBe(1);
    flush();
    expect(state.cardAnimationIndex()).toBe(3);
    expect(state.scrollProgress()).toBe(0);
    flush();
    expect(frames).toHaveLength(0);
  });

  it('syncs to the resting position when scrolling ends', () => {
    const state = listen();
    scrollY = 250;
    window.dispatchEvent(new Event('scrollend'));
    flush();

    expect(state.cardAnimationIndex()).toBe(2);
    expect(state.scrollProgress()).toBe(0.5);
    flush();
    expect(frames).toHaveLength(0);
  });

  function listen(): {
    readonly cardAnimationIndex: WritableSignal<number>;
    readonly scrollProgress: WritableSignal<number>;
  } {
    scrollY = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames.splice(id - 1, 1);
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => 100,
    });

    const cardAnimationIndex = signal(0);
    const scrollProgress = signal(0);
    let cleanup = (): void => undefined;
    setupScrollListener({
      totalItems: signal(4),
      state: {
        activeIndex: signal(0),
        cardAnimationIndex,
        scrollProgress,
      },
      destroyRef: {
        onDestroy: (cb: () => void) => {
          cleanup = cb;
          return cb;
        },
      } as DestroyRef,
    });
    flush();
    cleanups.push(cleanup);
    return { cardAnimationIndex, scrollProgress };
  }

  function flush(): void {
    const cb = frames.shift();
    cb?.(0);
  }
});

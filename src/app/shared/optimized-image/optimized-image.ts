// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Responsive image that fades in once the bitmap is decoded. */

import type { ElementRef } from '@angular/core';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { ImageUrls } from '../../core/images/image-urls';
import {
  CARD_SIZES,
  FULL_SIZES,
  type ImagePreset,
} from '../../core/images/image-delivery';

/**
 * Renders an `<img>` for a logical path under `images/`.
 * The browser receives a Cloudflare transformation URL, `srcset`, and `sizes`.
 */
@Component({
  selector: 'app-optimized-image',
  templateUrl: './optimized-image.html',
  styleUrl: './optimized-image.scss',
})
export class OptimizedImage {
  private readonly images = inject(ImageUrls);

  /** Logical path, e.g. "images/insights/inference-platform.png". */
  readonly src = input.required<string>();

  readonly alt = input<string>('');

  readonly loading = input<'eager' | 'lazy'>('lazy');

  readonly fetchpriority = input<'high' | 'low' | 'auto'>('auto');

  readonly aspectRatio = input<string | null>(null);

  /** `card` uses the insight-grid widths. `full` is for viewport backgrounds. */
  readonly preset = input<ImagePreset>('full');

  /** Overrides the preset `sizes` value when the layout is not the default. */
  readonly sizes = input<string | null>(null);

  /** Fades the bitmap in once. Off when the image should be visible immediately. */
  readonly fadeIn = input(true);

  protected readonly resolvedSrc = computed(() =>
    this.preset() === 'card'
      ? this.images.cardSrc(this.src())
      : this.images.fullSrc(this.src())
  );

  protected readonly resolvedSrcset = computed(() =>
    this.preset() === 'card'
      ? this.images.cardSrcset(this.src())
      : this.images.fullSrcset(this.src())
  );

  protected readonly resolvedSizes = computed(
    () => this.sizes() ?? (this.preset() === 'card' ? CARD_SIZES : FULL_SIZES)
  );

  protected readonly loaded = signal(false);

  protected readonly imgRef = viewChild<ElementRef<HTMLImageElement>>('img');

  constructor() {
    effect(() => {
      this.src();
      this.loaded.set(false);
      // A cached image can finish loading before this effect runs. Check again
      // in a microtask so the fade does not turn off and back on.
      queueMicrotask(() => this.revealIfDecoded());
    });

    afterNextRender(() => {
      this.revealIfDecoded();
    });
  }

  protected reveal(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.complete) {
      return;
    }
    this.loaded.set(true);
  }

  private revealIfDecoded(): void {
    const img = this.imgRef()?.nativeElement;
    if (img?.complete && img.naturalWidth > 0) {
      this.loaded.set(true);
    }
  }
}

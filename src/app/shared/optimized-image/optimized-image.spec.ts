// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import {
  buildImageUrl,
  buildSrcset,
  CARD_SIZES,
  CARD_SRC_WIDTH,
  CARD_WIDTHS,
} from '../../core/images/image-delivery';
import { IMAGE_MANIFEST } from '../../core/images/image-manifest.generated';
import { OptimizedImage } from './optimized-image';

const COVER = 'images/insights/covers/boardroom.png';

describe('OptimizedImage', () => {
  let component: OptimizedImage;
  let fixture: ComponentFixture<OptimizedImage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptimizedImage],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizedImage);
    component = fixture.componentInstance;

    const componentRef = fixture.componentRef;
    componentRef.setInput('src', COVER);
    componentRef.setInput('preset', 'card');

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the card image for the active environment', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');
    const src = buildImageUrl({
      assetsOrigin: environment.assetsUrl,
      path: COVER,
      width: CARD_SRC_WIDTH,
      version: IMAGE_MANIFEST[COVER],
    });

    const srcset = buildSrcset({
      assetsOrigin: environment.assetsUrl,
      path: COVER,
      widths: CARD_WIDTHS,
    });

    expect(img?.getAttribute('src')).toBe(src);
    expect(img?.getAttribute('srcset')).toBe(srcset || null);
    expect(img?.getAttribute('sizes')).toBe(CARD_SIZES);
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('should pass through alt text', () => {
    fixture.componentRef.setInput('alt', 'A boardroom interior');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img?.getAttribute('alt')).toBe('A boardroom interior');
  });

  it('should default loading to lazy', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img') as HTMLImageElement;

    expect(img?.loading).toBe('lazy');
  });

  it('should default fetchpriority to auto (attribute absent)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('img');

    expect(img?.getAttribute('fetchpriority')).toBeNull();
  });
});

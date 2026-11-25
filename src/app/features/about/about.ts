// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview About page with a full-viewport photograph. */

import { Component, inject } from '@angular/core';
import { ABOUT_IMAGE_PATH } from '../../core/images/image-delivery';
import { Seo } from '../../core/seo/seo';
import { OptimizedImage } from '../../shared/optimized-image/optimized-image';

/** About page. The copy is intentionally a single line for now. */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  imports: [OptimizedImage],
})
export class About {
  private readonly seo = inject(Seo);

  protected readonly imagePath = ABOUT_IMAGE_PATH;

  constructor() {
    this.seo.setPageSeo('about');
  }
}

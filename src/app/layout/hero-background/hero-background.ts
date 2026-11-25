// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Fixed full-viewport hero photograph. */

import { Component } from '@angular/core';
import { HERO_IMAGE_PATH } from '../../core/images/image-delivery';
import { OptimizedImage } from '../../shared/optimized-image/optimized-image';

/** Full-screen hero background. */
@Component({
  selector: 'app-hero-background',
  imports: [OptimizedImage],
  templateUrl: './hero-background.html',
  styleUrl: './hero-background.scss',
})
export class HeroBackground {
  protected readonly slogan = 'BEHIND YOU';

  protected readonly heroImagePath = HERO_IMAGE_PATH;
}

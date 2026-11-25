// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Image URL builder for components. */

import { Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  buildImageUrl,
  buildSrcset,
  CARD_SRC_WIDTH,
  CARD_WIDTHS,
  FULL_SRC_WIDTH,
  FULL_WIDTHS,
  type ImageFormat,
  normalizeImagePath,
  OG_IMAGE_WIDTH,
} from './image-delivery';
import { IMAGE_MANIFEST } from './image-manifest.generated';

/** Angular access to the shared transformation URL builder and content hashes. */
@Service()
export class ImageUrls {
  fullSrc(path: string): string {
    return this.url(path, FULL_SRC_WIDTH, 'auto');
  }

  fullSrcset(path: string): string {
    return this.srcset(path, FULL_WIDTHS, 'auto');
  }

  cardSrc(path: string): string {
    return this.url(path, CARD_SRC_WIDTH, 'auto');
  }

  cardSrcset(path: string): string {
    return this.srcset(path, CARD_WIDTHS, 'auto');
  }

  ogSrc(path: string): string {
    return this.url(path, OG_IMAGE_WIDTH, 'jpeg');
  }

  private url(path: string, width: number, format: ImageFormat): string {
    return buildImageUrl({
      assetsOrigin: environment.assetsUrl,
      path,
      width,
      format,
      version: this.version(path),
    });
  }

  private srcset(
    path: string,
    widths: readonly number[],
    format: ImageFormat
  ): string {
    return buildSrcset({
      assetsOrigin: environment.assetsUrl,
      path,
      widths,
      format,
      version: this.version(path),
    });
  }

  private version(path: string): string | undefined {
    return IMAGE_MANIFEST[normalizeImagePath(path)];
  }
}

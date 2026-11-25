// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Resolves a case PDF to a local file during development and to
 * the R2 object after deploy. PDFs are not passed through image transformations.
 */

import { Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { buildDocumentUrl, normalizeImagePath } from './image-delivery';
import { IMAGE_MANIFEST } from './image-manifest.generated';

@Service()
export class DocumentDelivery {
  url(path: string): string {
    const key = normalizeImagePath(path);
    return buildDocumentUrl({
      assetsOrigin: environment.assetsUrl,
      path: key,
      version: IMAGE_MANIFEST[key],
    });
  }
}

// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview 404 route. */

import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo/seo';
import { NotFoundView } from '../../shared/not-found-view/not-found-view';

/** 404 page with noindex SEO. */
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  imports: [NotFoundView],
})
export class NotFound {
  private readonly seo = inject(Seo);

  constructor() {
    this.seo.setPageSeo('notFound');
  }
}

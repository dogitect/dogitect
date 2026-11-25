// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Shared full-viewport missing-page view. */

import { Component, input } from '@angular/core';

/** Full-viewport status screen shared by the 404 route and missing content. */
@Component({
  selector: 'app-not-found-view',
  templateUrl: './not-found-view.html',
  styleUrl: './not-found-view.scss',
})
export class NotFoundView {
  readonly code = input('404');

  readonly heading = input('Page Not Found');
}

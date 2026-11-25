// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Preloads routes marked with `data.preload`. */

import { Service } from '@angular/core';
import type { PreloadingStrategy, Route } from '@angular/router';
import type { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';

/**
 * Preloads only routes whose data.preload is true.
 * Reduces initial preload payload vs PreloadAllModules.
 */
@Service()
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] === true ? load() : EMPTY;
  }
}

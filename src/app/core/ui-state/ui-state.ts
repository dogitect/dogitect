// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Cross-cutting UI state shared between unrelated components,
 * e.g. hiding the global navigation while a fullscreen overlay is open.
 */

import { Service, signal } from '@angular/core';

/** Cross-component UI state container. */
@Service()
export class UiState {
  private readonly navigationHiddenSource = signal(false);

  /** Whether the global navigation should be hidden. */
  readonly navigationHidden = this.navigationHiddenSource.asReadonly();

  /** Hides the global navigation (e.g. when entering a fullscreen overlay). */
  hideNavigation(): void {
    this.navigationHiddenSource.set(true);
  }

  /** Restores the global navigation visibility. */
  showNavigation(): void {
    this.navigationHiddenSource.set(false);
  }
}

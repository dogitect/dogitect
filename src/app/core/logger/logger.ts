// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Centralized logger that suppresses non-critical logs in
 * production and routes errors through `console.error` so that monitoring
 * pipelines can capture them.
 */

import { Service } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Centralized logger that suppresses non-critical logs in production. Errors
 * are always emitted so a monitoring pipeline can capture them.
 */
@Service()
export class Logger {
  /** Logs a warning. Suppressed in production builds. */
  warn(...args: unknown[]): void {
    if (!environment.production) {
      console.warn(...args);
    }
  }

  /** Logs an error. Always emitted. */
  error(...args: unknown[]): void {
    console.error(...args);
  }

  /** Logs a debug message. Suppressed in production builds. */
  debug(...args: unknown[]): void {
    if (!environment.production) {
      console.debug('[debug]', ...args);
    }
  }
}

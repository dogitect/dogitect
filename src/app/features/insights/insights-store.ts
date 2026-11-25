// Copyright 2026 Leon Xia. MIT License.

/**
 * @fileoverview Loads the prebuilt insight cases from `cases.json`.
 * Case order and text are compiled from `content/insights` before the app builds.
 */

import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service } from '@angular/core';
import { Logger } from '../../core/logger/logger';
import type { InsightCase } from './insights.models';

const CASES_URL = 'content/insights/cases.json';
const LOAD_ERROR = 'Could not load insights.';

function isInsightCase(value: unknown): value is InsightCase {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item['slug'] === 'string' &&
    typeof item['title'] === 'string' &&
    typeof item['subtitle'] === 'string' &&
    typeof item['description'] === 'string' &&
    typeof item['date'] === 'string' &&
    typeof item['imagePath'] === 'string' &&
    typeof item['pdfPath'] === 'string'
  );
}

/** Cached insight cases for the insights page. */
@Service()
export class InsightsStore {
  private readonly logger = inject(Logger);

  /** Cases in authored order. */
  readonly cases = httpResource<readonly InsightCase[]>(() => CASES_URL, {
    defaultValue: [],
    parse: (value: unknown): readonly InsightCase[] => {
      if (!Array.isArray(value) || !value.every(isInsightCase)) {
        throw new Error('Invalid insights');
      }
      return value;
    },
  });

  /** User-facing load failure, or `null` while the list is usable. */
  readonly loadError = computed(() => (this.cases.error() ? LOAD_ERROR : null));

  /** True until the case list has settled. */
  readonly loading = computed(() => {
    if (this.loadError()) {
      return false;
    }
    const status = this.cases.status();
    return status === 'idle' || status === 'loading' || status === 'reloading';
  });

  constructor() {
    effect(() => {
      const error = this.cases.error();
      if (error) {
        this.logger.warn('InsightsStore: Failed to load cases', error);
      }
    });
  }
}

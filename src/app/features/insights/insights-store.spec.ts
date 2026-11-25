// Copyright 2026 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InsightsStore } from './insights-store';

describe('InsightsStore', () => {
  let store: InsightsStore;
  let http: HttpTestingController;

  const inferencePlatform = {
    slug: 'inference-platform',
    title: 'Inference Platform',
    subtitle: 'The production path for a model',
    description: 'Routing, capacity, and an evaluation gate.',
    date: '2026-09',
    imagePath: 'images/insights/inference-platform.png',
    pdfPath: 'documents/insights/inference-platform.pdf',
  };

  const landingZone = {
    slug: 'landing-zone',
    title: 'Landing Zone',
    subtitle: 'The production path for a model',
    description: 'Routing, capacity, and an evaluation gate.',
    date: '2026-02',
    imagePath: 'images/insights/landing-zone.png',
    pdfPath: 'documents/insights/landing-zone.pdf',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InsightsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(InsightsStore);
    http = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads cases in authored order', async () => {
    expect(store.loading()).toBe(true);

    http
      .expectOne('content/insights/cases.json')
      .flush([inferencePlatform, landingZone]);
    await Promise.resolve();
    TestBed.flushEffects();

    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(store.cases.value()).toEqual([inferencePlatform, landingZone]);
  });

  it('reports an error when cases.json fails', async () => {
    http
      .expectOne('content/insights/cases.json')
      .flush('nope', { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    TestBed.flushEffects();

    expect(store.loading()).toBe(false);
    expect(store.loadError()).toBe('Could not load insights.');
    expect(store.cases.hasValue()).toBe(false);
  });

  it('does not request cases.json again after it resolves', async () => {
    http.expectOne('content/insights/cases.json').flush([]);
    await Promise.resolve();
    TestBed.flushEffects();

    expect(store.cases.value()).toEqual([]);
    http.expectNone('content/insights/cases.json');
  });
});

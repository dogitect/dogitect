// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Insights } from './insights';

describe('Insights', () => {
  let component: Insights;
  let fixture: ComponentFixture<Insights>;
  let http: HttpTestingController;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('1024.01px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    await TestBed.configureTestingModule({
      imports: [Insights],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Insights);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    for (const req of http.match(() => true)) {
      req.flush([]);
    }
    http.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the case list empty until the content loads', () => {
    http.expectOne('content/insights/cases.json');
    expect(component['cases']()).toEqual([]);
    expect(component['totalCases']()).toBe(0);
    expect(component['activeIndex']()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Loading insights.');
  });
});

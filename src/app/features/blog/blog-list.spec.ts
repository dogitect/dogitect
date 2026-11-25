// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlogList } from './blog-list';

describe('BlogList', () => {
  let fixture: ComponentFixture<BlogList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogList],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogList);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    for (const req of http.match(() => true)) {
      req.flush([]);
    }
    http.verify();
  });

  it('shows a Draft mark when the index includes a draft', async () => {
    expect(fixture.nativeElement.textContent).toContain('Loading notes.');

    http.expectOne('content/blog/index.json').flush([
      {
        slug: 'hello-world',
        title: 'Hello world',
        description: 'A draft note kept off the published site.',
        date: '2026-01-01',
        categories: ['Hello'],
        draft: true,
      },
    ]);
    await Promise.resolve();
    TestBed.flushEffects();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hello world');
    expect(text).toContain('Draft');
    expect(text).toContain('Jan 2026');
    expect(text).not.toContain('Loading notes.');
  });

  it('shows an error when the index fails', async () => {
    http
      .expectOne('content/blog/index.json')
      .flush('nope', { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    TestBed.flushEffects();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load notes.');
    expect(text).not.toContain('Loading notes.');
  });
});

// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { BlogPostFile } from '../../core/content/blog/blog.models';
import { BlogPost } from './blog-post';

describe('BlogPost', () => {
  let fixture: ComponentFixture<BlogPost>;
  let http: HttpTestingController;

  function postFile(slug: string, body: string): BlogPostFile {
    return {
      slug,
      title: slug,
      description: 'A note.',
      date: '2026-01-01',
      categories: ['Hello'],
      draft: false,
      blocks: [{ type: 'html', html: `<p>${body}</p>` }],
    };
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogPost],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    for (const req of http.match(() => true)) {
      req.flush(postFile('leftover', 'Leftover'));
    }
    http.verify();
  });

  it('waits without a request until a slug is bound', async () => {
    fixture = TestBed.createComponent(BlogPost);
    fixture.detectChanges();
    TestBed.flushEffects();
    await Promise.resolve();

    http.expectNone(() => true);
    expect(fixture.nativeElement.textContent).toContain('Loading note.');
  });

  it('renders the note for the current slug', async () => {
    fixture = TestBed.createComponent(BlogPost);
    fixture.componentRef.setInput('slug', 'hello-world');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading note.');
    http
      .expectOne('content/blog/hello-world.json')
      .flush(postFile('hello-world', 'Hello body'));
    await settle();

    expect(fixture.nativeElement.textContent).toContain('Hello body');
    expect(
      fixture.nativeElement.querySelector('app-not-found-view')
    ).toBeNull();

    fixture.componentRef.setInput('slug', 'second-note');
    TestBed.flushEffects();
    http
      .expectOne('content/blog/second-note.json')
      .flush(postFile('second-note', 'Second body'));
    await settle();

    expect(fixture.nativeElement.textContent).toContain('Second body');
  });

  it('shows the not-found view for an unsafe slug', async () => {
    fixture = TestBed.createComponent(BlogPost);
    fixture.componentRef.setInput('slug', '../secret');
    fixture.detectChanges();
    TestBed.flushEffects();
    await Promise.resolve();

    http.expectNone(() => true);
    expect(
      fixture.nativeElement.querySelector('app-not-found-view')
    ).toBeTruthy();
  });

  it('shows the not-found view when the post fails to load', async () => {
    fixture = TestBed.createComponent(BlogPost);
    fixture.componentRef.setInput('slug', 'missing-note');
    fixture.detectChanges();

    http
      .expectOne('content/blog/missing-note.json')
      .flush('nope', { status: 404, statusText: 'Not Found' });
    await settle();

    expect(
      fixture.nativeElement.querySelector('app-not-found-view')
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Loading note.');
  });
});

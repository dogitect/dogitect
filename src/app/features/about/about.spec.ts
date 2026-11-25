// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { About } from './about';

describe('About', () => {
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the introduction', () => {
    const heading = fixture.nativeElement.querySelector('.about__title');
    expect(heading?.textContent).toBe("Hi, I'm Leon Xia");
  });

  it('should use the about photograph', () => {
    const image = fixture.nativeElement.querySelector('img');
    expect(image?.getAttribute('src')).toContain('images/about.jpg');
  });
});

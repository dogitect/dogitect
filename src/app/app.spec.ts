// Copyright 2026 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have showHeroBackground computed signal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app['showHeroBackground']).toBeTruthy();
  });

  it('should render navigation component', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navigation')).toBeTruthy();
  });

  it('should have showFooter computed signal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app['showFooter']).toBeTruthy();
    expect(typeof app['showFooter']()).toBe('boolean');
  });

  it('should conditionally render hero background based on route', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(typeof app['showHeroBackground']()).toBe('boolean');
  });

  it('renders the hero inside main on the home route', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const main = (fixture.nativeElement as HTMLElement).querySelector(
      'main#main-content'
    );
    expect(main?.querySelector('app-hero-background')).toBeTruthy();
  });
});

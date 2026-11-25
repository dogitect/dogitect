// Copyright 2026 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Breakpoint } from './breakpoint';

describe('Breakpoint', () => {
  let service: Breakpoint;

  const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('1024.01px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    TestBed.configureTestingModule({
      providers: [Breakpoint, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(Breakpoint);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have deviceType signal', () => {
    expect(service.deviceType).toBeDefined();
    expect(typeof service.deviceType()).toBe('string');
  });

  it('should have isMobile computed signal', () => {
    expect(service.isMobile).toBeDefined();
    expect(typeof service.isMobile()).toBe('boolean');
  });

  it('should have individual breakpoint signals', () => {
    expect(typeof service.isPhone()).toBe('boolean');
    expect(typeof service.isTablet()).toBe('boolean');
    expect(typeof service.isDesktop()).toBe('boolean');
  });

  it('should default to desktop when desktop breakpoint matches', () => {
    expect(service.deviceType()).toBe('desktop');
  });
});

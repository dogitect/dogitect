// Copyright 2026 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { UiState } from './ui-state';

describe('UiState', () => {
  let service: UiState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiState],
    });
    service = TestBed.inject(UiState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have navigationHidden signal initialized to false', () => {
    expect(service.navigationHidden()).toBe(false);
  });

  describe('hideNavigation', () => {
    it('should set navigationHidden to true', () => {
      service.hideNavigation();
      expect(service.navigationHidden()).toBe(true);
    });
  });

  describe('showNavigation', () => {
    it('should set navigationHidden to false', () => {
      service.hideNavigation();
      expect(service.navigationHidden()).toBe(true);

      service.showNavigation();
      expect(service.navigationHidden()).toBe(false);
    });
  });

  it('should toggle navigation visibility correctly', () => {
    expect(service.navigationHidden()).toBe(false);

    service.hideNavigation();
    expect(service.navigationHidden()).toBe(true);

    service.showNavigation();
    expect(service.navigationHidden()).toBe(false);

    service.hideNavigation();
    expect(service.navigationHidden()).toBe(true);
  });
});

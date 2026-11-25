// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { HeroBackground } from './hero-background';

describe('HeroBackground', () => {
  let component: HeroBackground;
  let fixture: ComponentFixture<HeroBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroBackground],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroBackground);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have background image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector('.hero-background__image');
    expect(image).toBeTruthy();
  });

  it('should display slogan', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const slogan = compiled.querySelector('.hero-background__slogan-text');
    expect(slogan?.textContent).toBe('BEHIND YOU');
  });
});

// Copyright 2026 Leon Xia. MIT License.

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('.contact__heading');
    expect(heading?.textContent).toContain("Let's Talk");
  });

  it('should display contact form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('.contact__form');
    expect(form).toBeTruthy();
  });

  it('should have all required form fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#fullName')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#projectInfo')).toBeTruthy();
  });

  it('should have submit button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('.contact__submit');
    expect(submitBtn).toBeTruthy();
    expect(submitBtn?.textContent?.trim()).toBe('Send a message');
    expect(submitBtn?.hasAttribute('disabled')).toBe(false);
  });

  it('should initialize form as invalid', () => {
    expect(component['contactForm']().invalid()).toBe(true);
  });

  it('shows a name error when the empty form is submitted', async () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.requestSubmit();
    await Promise.resolve();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter your name.');
  });
});

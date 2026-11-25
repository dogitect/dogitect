// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Contact form that opens the visitor's email app. */

import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import type { FieldTree, TreeValidationResult } from '@angular/forms/signals';
import { Seo } from '../../core/seo/seo';

/** Maximum character lengths permitted for each form field. */
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PROJECT_INFO_LENGTH = 2000;
const MIN_NAME_LENGTH = 2;
const CONTACT_EMAIL = 'contact@dogitect.com';
const DELIVERY_MESSAGE =
  'Could not open your email app. Write to contact@dogitect.com.';

interface ContactModel {
  fullName: string;
  email: string;
  projectInfo: string;
}

function fieldError(field: FieldTree<string>): string | null {
  const state = field();
  if (!state.touched() || !state.invalid()) {
    return null;
  }
  return state.errors()[0]?.message ?? null;
}

/** Contact page with a signal form and mailto submission. */
@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  imports: [FormField, FormRoot],
})
export class Contact {
  private readonly seo = inject(Seo);
  private readonly document = inject(DOCUMENT);

  private readonly model = signal<ContactModel>({
    fullName: '',
    email: '',
    projectInfo: '',
  });

  /** True after the mailto URL was handed to the browser. */
  protected readonly emailReady = signal(false);

  protected readonly contactForm = form(
    this.model,
    (path) => {
      required(path.fullName, { message: 'Enter your name.' });
      minLength(path.fullName, MIN_NAME_LENGTH, {
        message: 'Use at least 2 characters.',
      });
      maxLength(path.fullName, MAX_NAME_LENGTH, {
        message: 'Use at most 100 characters.',
      });
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      maxLength(path.email, MAX_EMAIL_LENGTH, {
        message: 'Use at most 254 characters.',
      });
      required(path.projectInfo, {
        message: 'Tell me what I can do for you.',
      });
      maxLength(path.projectInfo, MAX_PROJECT_INFO_LENGTH, {
        message: 'Use at most 2000 characters.',
      });
    },
    {
      submission: {
        action: () => this.openMailto(),
      },
    }
  );

  protected readonly nameError = computed(() =>
    fieldError(this.contactForm.fullName)
  );

  protected readonly emailError = computed(() =>
    fieldError(this.contactForm.email)
  );

  protected readonly projectError = computed(() =>
    fieldError(this.contactForm.projectInfo)
  );

  protected readonly deliveryError = computed(() => {
    const error = this.contactForm()
      .errors()
      .find((item) => item.kind === 'delivery');
    return error?.message ?? null;
  });

  constructor() {
    this.seo.setPageSeo('contact');
  }

  private openMailto(): Promise<TreeValidationResult> {
    const { fullName, email: emailAddress, projectInfo } = this.model();
    const subject = encodeURIComponent(`Contact from ${fullName}`);
    const body = encodeURIComponent(
      `Name: ${fullName}\nEmail: ${emailAddress}\n\nProject Info:\n${projectInfo}`
    );
    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    const view = this.document.defaultView;
    if (!view) {
      return Promise.resolve({ kind: 'delivery', message: DELIVERY_MESSAGE });
    }
    try {
      view.location.href = mailtoUrl;
    } catch {
      return Promise.resolve({ kind: 'delivery', message: DELIVERY_MESSAGE });
    }
    this.emailReady.set(true);
    this.model.set({ fullName: '', email: '', projectInfo: '' });
    return Promise.resolve(undefined);
  }
}

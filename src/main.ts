// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview Bootstraps the Angular application. */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => {
  console.error('Bootstrap failed:', err);
});

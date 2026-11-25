// Copyright 2026 Leon Xia. MIT License.

/** @fileoverview View model for one insight case. */

/** A case: one still, one PDF, and the text shown on the insights page. */
export interface InsightCase {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly date: string;
  /** Logical PNG path for the case still. */
  readonly imagePath: string;
  /** Logical PDF path for the download. */
  readonly pdfPath: string;
}

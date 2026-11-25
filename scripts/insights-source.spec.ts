// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import { readInsightSource } from './insights-source';

describe('readInsightSource', () => {
  it('reads authored cases in projects.json order', async () => {
    const source = await readInsightSource();

    expect(source.errors).toEqual([]);
    expect(source.projects).toEqual(['inference-platform']);
    expect(source.cases).toEqual([
      {
        slug: 'inference-platform',
        title: 'Inference Platform',
        subtitle: 'The production path for a model',
        description:
          'Routing, capacity, and an evaluation gate for models that leave the notebook. The design names what a request costs once it is served.',
        date: '2026-09',
        imagePath: 'images/insights/inference-platform.png',
        pdfPath: 'documents/insights/inference-platform.pdf',
      },
    ]);
  });
});

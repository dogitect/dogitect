// Copyright 2026 Leon Xia. MIT License.

import { describe, expect, it } from 'vitest';
import {
  blogImagePath,
  figmaEmbed,
  parseBlogMarkdown,
  postsForBuild,
} from './blog-document';
import type { BlogCard } from '../src/app/core/content/blog/blog.models';

const SAMPLE = `---
draft: true
slug: hello-world
date: 2026-01-01
title: Hello world
description: A draft note kept off the published site.
categories:
  - Hello
---

# Hello world!

A short note.

<script>alert(1)</script>

\`\`\`figma
https://www.figma.com/slides/Qxk1CRhDC5fVuM5kHJtzeZ/Example
\`\`\`
`;

describe('figmaEmbed', () => {
  it('rewrites slides, design, board, proto, make, and site', () => {
    const kinds = ['slides', 'design', 'board', 'proto', 'make', 'site'];
    for (const kind of kinds) {
      const embed = figmaEmbed(`https://www.figma.com/${kind}/Ab12/Title`);
      expect(embed.embedUrl).toBe(
        `https://embed.figma.com/${kind}/Ab12?embed-host=dogitect&theme=dark&footer=false&page-selector=false&hide-ui=1`
      );
      expect(embed.title).toBe('Title');
    }
  });

  it('maps file to design and keeps node-id', () => {
    const embed = figmaEmbed('https://figma.com/file/Ab12/Frame?node-id=1-2');
    expect(embed.embedUrl).toBe(
      'https://embed.figma.com/design/Ab12?node-id=1-2&embed-host=dogitect&theme=dark&footer=false&page-selector=false&hide-ui=1'
    );
  });

  it('rejects other hosts, schemes, and paths', () => {
    expect(() => figmaEmbed('http://www.figma.com/slides/Ab12/Title')).toThrow(
      /not allowed/
    );
    expect(() =>
      figmaEmbed('https://community.figma.com/file/Ab12/Title')
    ).toThrow(/not allowed/);
    expect(() =>
      figmaEmbed('https://www.figma.com/community/file/Ab12/Title')
    ).toThrow(/not allowed/);
  });
});

describe('postsForBuild', () => {
  const posts: BlogCard[] = [
    {
      slug: 'older',
      title: 'Older',
      description: 'Earlier',
      date: '2026-01-01',
      categories: ['Notes'],
      draft: false,
    },
    {
      slug: 'draft-note',
      title: 'Draft',
      description: 'Hidden',
      date: '2026-03-01',
      categories: ['Notes'],
      draft: true,
    },
    {
      slug: 'newer',
      title: 'Newer',
      description: 'Later',
      date: '2026-02-01',
      categories: ['Notes'],
      draft: false,
    },
  ];

  it('drops drafts and sorts newest first', () => {
    expect(postsForBuild(posts, false).map((post) => post.slug)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('keeps drafts when local preview asks for them', () => {
    expect(postsForBuild(posts, true).map((post) => post.slug)).toEqual([
      'draft-note',
      'newer',
      'older',
    ]);
  });
});

describe('parseBlogMarkdown', () => {
  it('reads the sample draft and strips script tags', async () => {
    const post = await parseBlogMarkdown('hello-world.md', SAMPLE);
    expect(post.title).toBe('Hello world');
    expect(post.draft).toBe(true);
    expect(post.blocks[0]).toMatchObject({ type: 'html' });
    const html = post.blocks[0]?.type === 'html' ? post.blocks[0].html : '';
    expect(html).toContain('<h1>Hello world!</h1>');
    expect(html).not.toContain('script');
    expect(post.cover).toBe('images/blog/default-cover.png');
    expect(post.blocks[1]).toEqual({
      type: 'figma',
      embedUrl:
        'https://embed.figma.com/slides/Qxk1CRhDC5fVuM5kHJtzeZ?embed-host=dogitect&theme=dark&footer=false&page-selector=false&hide-ui=1',
      title: 'Example',
    });
  });
});

describe('markdown compatibility', () => {
  it('keeps GitHub markdown and drops a script tag', async () => {
    const source = `---
slug: markdown-marks
date: 2026-04-01
title: Marks
description: A compatibility sample.
categories:
  - Notes
---

# Marks

**Bold** and ~~gone~~.

| Name | Count |
| --- | ---: |
| Cards | 4 |

- [x] Done
- [ ] Left

\`\`\`ts
const value = 1;
\`\`\`

<script>alert(1)</script>
`;
    const post = await parseBlogMarkdown('markdown-marks.md', source);
    const html = post.blocks
      .filter((block) => block.type === 'html')
      .map((block) => (block.type === 'html' ? block.html : ''))
      .join('\n');

    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<del>gone</del>');
    expect(html).toContain('<table>');
    expect(html).toContain('<th align="right">Count</th>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).not.toContain('script');
  });
});

describe('blogImagePath', () => {
  it('accepts a png beside the post', () => {
    expect(
      blogImagePath('hello-world', 'images/blog/hello-world/cover.png')
    ).toBe('images/blog/hello-world/cover.png');
  });

  it('rejects a path outside the post directory', () => {
    expect(() =>
      blogImagePath('hello-world', 'images/insights/inference-platform.png')
    ).toThrow(/Image must be/);
  });
});

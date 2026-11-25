# Content

Authored content lives outside `public/`. The build writes the JSON the site loads.

## Insights

```
content/insights/
├── projects.json                 # Ordered case slugs
└── [case]/
    └── metadata.json             # Case title, subtitle, description, date
```

`bun run insights:build` writes `public/content/insights/cases.json`. The page and the worker both read that one file.

- **Images** are original files in `public/images/`. Each case still is `images/insights/<case>.png`. The about page background is `images/about.jpg`.
- **PDFs** are the case downloads in `public/documents/insights/<case>.pdf`. They sync to the R2 `documents/` prefix and are not part of the site bundle.
- A case has no `slideCount`.
- Add a case by listing its slug in `content/insights/projects.json` and adding the matching folder, PNG, and PDF.

## Blog

Blog posts are Markdown files in `content/blog/<slug>.md`. The build writes `public/content/blog/index.json` for the card list and `public/content/blog/<slug>.json` for the rendered blocks. A `draft: true` post is visible in local preview and omitted from the published site. A post without `cover` uses `images/blog/default-cover.png`.

---
title: Page naming convention (xwiki.org)
stability: durable
summary: New pages on xwiki.org use lowercase kebab-case page names (hyphen-separated, no stop
  words), following the page title; page names are distinct from human-readable page titles.
sources:
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationStyle/PageTitlesNames/
  - https://extensions.xwiki.org/xwiki/bin/view/Extension/Model/Validation/Default/
---

# Page naming convention (xwiki.org)

Any **new page created on xwiki.org** (and any extension page refactored into the new
Documentation location) must name its **page** — the technical document name that appears in the
URL — in **lowercase kebab-case**: words lowercased and separated by hyphens.

- Example: a blog post titled "Highlights of XWiki 17.x cycle" is the page
  `Blog.xwiki-17-cycle-release-notes`, **not** `Blog.XWiki17CycleReleaseNotes` (the old
  CamelCase style). This applies to blog posts, documentation, and every other page.
- Use the [kebab-case naming strategy](https://extensions.xwiki.org/xwiki/bin/view/Extension/Model/Validation/Default/).
- **Remove stop words** ("a", "the", "on", "when", "while", …). Note: until xwiki.org is upgraded
  to XWiki 18.1.0+, stop-word removal must be done manually (the strategy will do it automatically
  afterwards).
- The **page name** should follow the **page title** as closely as possible while respecting the
  rules above.
- **Avoid repetition in URL paths**: don't repeat a word already provided by the parent path —
  e.g. `../wiki-editor-toolbar/support`, not `../wiki-editor-toolbar/wiki-editor-toolbar-support`.

This concerns the page **name** (the document reference / URL segment). Page **titles** are
separate, human-readable, and follow their own Diataxis-based rules — see the DocGuide source. For
the doc-writing procedure use the `xwiki-documentation` skill.

---
title: XWiki documentation conventions (Documentation Guide)
stability: durable
summary: The rules for xwiki.org documentation — Diataxis page types & audiences, title/page-name
  rules, per-type content rules, the page-structure xobject fields, documentation style, page
  location, and version-perspective rules. The live Documentation Guide is the evolving source of
  truth; prefer it whenever a detail here is borderline or missing.
sources:
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/ApplyDiataxis/
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationStyle/
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationStyle/PageTitlesNames/
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/PageStructure/
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/Versioning/
  - https://diataxis.fr/
---

# XWiki documentation conventions

Declarative rules for **xwiki.org** documentation. The **procedures** that apply them live in the
skills: [`xwiki-doc-writing`] (write / update / review a page) and [`xwiki-doc-convert`] (convert old
documentation into the new `/documentation` tree).

The authoritative source of truth is the **XWiki Documentation Guide**
(https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide and its sub-pages — indexed at the end).
The guide is actively evolving: the rules below are a durable working summary, but **when a detail
matters or is missing here, consult the live guide and prefer it over this file**.

Scope facts:

- All **new** and refactored documentation lives under the documentation root
  https://www.xwiki.org/xwiki/bin/view/documentation/ — **not** under the old `Documentation` space
  or the Extensions wiki (those are the *old* documentation, being migrated out).
- Documentation pages are **wiki pages**, not files in a git repo — authored in XWiki syntax on the
  wiki, and submitted via a Change Request.
- All documentation is written in **English**, and a feature must be tested on a real wiki running an
  LTS version (or beyond) before being documented.

## Diataxis: one type + one audience per page

Every page follows the [Diataxis](https://diataxis.fr/) methodology and is **exactly one of four
types**, tagged with **one audience** (User / Administrator / Developer). If a page mixes types, it
must be split. The Diataxis type is stored on the page (see page-structure fields below) and drives
the type-grouped landing pages.

| Type | Orientation | Purpose |
|------|-------------|---------|
| **How-to** | goal-oriented | directions to achieve a specific goal |
| **Tutorial** | learning-oriented | a How-to applied to a concrete example; more specific / end-to-end |
| **Reference** | information-oriented | technical description covering a topic extensively |
| **Explanation** | understanding-oriented | discussion that answers "why" |

## Titles and page names

**Title rules depend on the type:**

| Type | Title |
|------|-------|
| How-to | **Starts with a verb** — "Select", "Configure", "Edit a Page" (not "Editing a Page") |
| Tutorial | **Starts with a verb**, and is **more specific** than a How-to — "Build a FAQ Application" |
| Reference | **Does not** start with a verb; indicates the topic is covered extensively — "All Wiki Pages" |
| Explanation | **Does not** start with a verb; a phrase naming the subject, answering "why" — "Conflict Resolution" |

**Page-name rules** (the URL segment):

- Use **kebab-case** (XWiki naming strategy).
- **Remove stop words** manually ("a", "the", "on", "when", "while"…) until xwiki.org is on XWiki
  18.1.0+ (which does it automatically).
- Follow the title as closely as possible while respecting the rules above.
- **No repetition between parent and child paths** — rely on the parent for context
  (`../wiki-editor-toolbar/support`, not `../wiki-editor-toolbar/wiki-editor-toolbar-support`).

## Content rules per type

- **How-to / Tutorial** — every step **starts with a verb** and is an item of a **numbered list**.
  Do **not** add extra explanations inside the steps; reader questions and clarifications go in the
  **FAQ** field instead. Tutorials may include short concrete examples.
- **Reference** — prefer **tables**, keep information concise; use **code examples** for API references.
- **Explanation** — explain concepts, limitations, consequences, and background.

## Page-structure fields

Documentation pages have stable, auto-generated level-1 headings backed by the
`DocApp.Code.DocumentationClass` xobject. The fields:

- **Content** — the main content for the page type. Additional headings go under it as level-2 (or
  lower) headings.
- **FAQ** — level-2 headings phrased as **questions** a user/admin/developer might have, with answers
  limited to **1–2 sentences**. If a longer answer is needed, create a dedicated Explanation page.
- **Highlights** — short points to help readers quickly discover key information.
- **Related links** — links to related pages.
- **Technical ID** — the id of the extension providing the documented feature (or its NPM package),
  copied from the Extensions-wiki `ExtensionCode` xobject. Empty when no extension applies (e.g.
  installation pages).

## Documentation style

- **Syntax** — write content in XWiki syntax.
- **UI elements** — buttons, menu items, tabs, panel names go in `"quotes"` — e.g. `Click the
  "Edit" button.`
- **XWiki terminology** — words with a special XWiki meaning (Panel, Sheet…) are written in **plain
  text with an uppercase first letter**, until a Glossary strategy exists.
- **Literals / computer terms** — use the `##monospace##` notation — e.g. `the ##age## xproperty`.
- **Linking** — do **not** hardcode xwiki.org URLs; use XWiki **link reference syntax** (copy the
  page reference from its Information tab). Use the relative reference for same-wiki links and the
  global reference for cross-wiki links. To link to a file on GitHub, use the `{{scm}}` macro so SCM
  moves don't break links.
- **Macros** — use the **code macro with an explicit `language` parameter** for code snippets
  (omitting it is slower and mis-colors). Use the **display macro** to avoid duplicated content: put
  repeated text/steps/images on a single hidden page and display it where needed.

## Choose the right location

Place the page under the **most relevant existing topic / subtopic** of the `/documentation` tree,
matching its audience (User / Admin / Developer) and type. Create a new top-level topic **only** when
no existing topic fits.

## Versioning and perspective

- Write documentation from the perspective of the **latest version**.
- Document differences from the latest version **secondarily**, using the
  [`{{version}}` macro](https://xwiki.org/xwiki/bin/view/documentation/extensions/user/documentation/version-macro/):
  - **New feature** — mark the version-specific content with `{{version since="…"}}`.
  - **Changed behavior / UI** — write the latest behavior normally, and use the macro's `before`
    parameter for the old behavior — e.g.
    `The tab uses the "Language" terminology ({{version before="16.10.12"}}Previously, the tab was using the "Locale" terminology{{/version}}).`
  - Skip the macro for trivial UI changes (no text changed, same behavior, same area) — it only
    clutters the page.
- **Maintenance** — remove content and version macros for **unsupported old versions**, and remove
  obsolete macros once the referenced version is no longer relevant.

## Documentation Guide — reference index

The authoritative, evolving pages (left-navigation of the Documentation Guide):

- [Documentation Guide (root)](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide)
- [Apply Diataxis](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/ApplyDiataxis/)
- [Choose the Right Location](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/ChooseRightLocation/)
- [Create New Documentation – Flow Guide](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/CreateNewDocumentation/)
- [Landing Pages](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/CreateLandingPages/)
- [Documentation Style](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationStyle/)
- [Page Titles and Page Names](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationStyle/PageTitlesNames/)
- [Page Structure](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/PageStructure/)
- [Documentation Navigation Panel](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationNavigationTree/)
- [Documentation Resources](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationResources/)
- [Versioning](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/Versioning/)
- [Working with Attachments](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/WorkingAttachments/)
- [Migrate and Refactor Documentation](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/)
- [Handle Original Documentation Pages](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/HandleOriginalDocumentationPages/)
- [Save Changes](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/SaveChanges/)
- [Diataxis methodology](https://diataxis.fr/)

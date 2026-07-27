---
name: xwiki-doc-writing
description: Write, update or review a page of XWiki documentation on xwiki.org, following the XWiki Documentation Guide (Diataxis type & audience, titles/page-names, page-structure fields, style, location, versioning). Use when authoring a NEW documentation page, updating an existing one, or reviewing a page for quality. New documentation lives under https://www.xwiki.org/xwiki/bin/view/documentation/. To CONVERT old documentation (the Documentation space or the Extensions wiki) into the new tree, use xwiki-doc-convert instead.
---

# Writing, updating and reviewing XWiki documentation

This skill is the **procedure** for producing and reviewing a page in the new `/documentation` tree.
The **rules** it applies (Diataxis types, titles/page-names, page-structure fields, style, location,
versioning) are declarative knowledge and live in the OKF: read
**`okf/conventions/documentation.md`** first — it is the working summary, and it points to the live
XWiki Documentation Guide, which is the evolving source of truth. When a detail is borderline or
missing, consult the live guide and prefer it.

For **converting** legacy documentation (old `Documentation` space or the Extensions wiki) into the
new tree, use the **`xwiki-doc-convert`** skill instead — it builds on this one.

## What this skill produces

Well-structured **page content in XWiki syntax** plus, when reviewing, a list of concrete findings.
Documentation pages are wiki pages, not files in a git repo: this skill does not commit files — the
developer creates/edits the page on the wiki and submits a Change Request.

## Flow — create a new page

1. **Check it doesn't already exist** elsewhere in `/documentation` (avoid duplication).
2. **Classify** the content: pick the single Diataxis type and the audience
   (see `okf/conventions/documentation.md`). If it mixes types, split it into several pages.
3. **Choose the location** — the most relevant existing topic/subtopic for that audience and type;
   create a new top-level topic only when nothing fits.
4. **Write the title and page name** per the type's rules (verb-led for How-to/Tutorial; noun phrase
   for Reference/Explanation; kebab-case page name, stop words removed, no parent/child repetition).
5. **Fill the page-structure fields** — Content (per type), FAQ (questions with 1–2 sentence
   answers), Related links (**non-child** pages only), Technical ID (the extension id, or empty).
   **Leave Highlights empty unless the page has many children**: it is a two-level list of the most
   important *child* pages, not a "key points" summary, and the automatic "More" table already lists
   every child — see `okf/conventions/documentation.md`.
6. **Apply the style rules** — `"quotes"` for UI elements, uppercase-first XWiki terminology,
   `##literals##`, link-reference syntax (never hardcoded URLs), `{{scm}}` for GitHub files, the
   code macro with an explicit `language`, the display macro to avoid duplication.
7. **Respect version perspective** — write for the latest version; use `{{version}}` (with `before`
   for changed behavior) only for genuine new/changed behavior.
8. Use the [Documentation Resources](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationResources/)
   XARs to set up a realistic environment for screenshots/examples.
9. **Save** via a Change Request (the expected way to submit edits).

## Flow — update an existing page

Keep the page a single Diataxis type. Re-check the title/page-name rules if the scope changed. Update
for the latest version and prune version macros/content for versions no longer supported. Move any
explanation that crept into How-to steps out to the FAQ field or a dedicated Explanation page.

## Review checklist

When reviewing a page, verify and report against these (each finding should cite the rule it relates
to; confirm against the live guide when borderline):

- [ ] **Type** — clearly one Diataxis type (not mixing How-to + Reference + …) with a target audience.
- [ ] **Title** — follows the verb rule for its type; Tutorial titles are specific.
- [ ] **Page name** — kebab-case, no stop words, follows the title, no parent/child path repetition.
- [ ] **Steps** — in How-to/Tutorial each step starts with a verb and is in a numbered list, no
      inline explanations.
- [ ] **FAQ** — reader questions live in the FAQ field (1–2 sentence answers), not buried in steps;
      longer answers split into an Explanation page.
- [ ] **Structure fields** — Content, FAQ and Related links filled; Technical ID set when an extension
      applies. **Highlights empty** unless the page has many children (and then only a subset of them);
      **Related holds no children** and never links to the page itself.
- [ ] **Title case** — significant words capitalised ("Using", not "using").
- [ ] **Style** — UI elements in `"quotes"`, terminology uppercased, literals in `##…##`, code macro
      uses a `language` parameter.
- [ ] **Links** — link-reference syntax (no hardcoded xwiki.org URLs); `{{scm}}` for GitHub files.
- [ ] **Location** — under the most relevant existing `/documentation` topic for its audience/type.
- [ ] **Versioning** — written for the latest version; `{{version}}` only for new/changed behavior;
      no obsolete macros or content for unsupported versions.

Report findings as a list of concrete, actionable items. Do **not** flag a pure style preference:
every finding must be justified by a rule violation (type/title/page-name/structure/style/link/
location/versioning) or a concrete usability or maintainability problem.

## Live examples per page type

Real, well-formed pages in the new tree — read them to calibrate structure, title style, and voice
for each Diataxis type:

- **How-to** (verb-led title, numbered verb-led steps):
  - [Edit a Page](https://www.xwiki.org/xwiki/bin/view/documentation/xs/user/base/page/edit-page/)
  - [Configure a Servlet Container](https://www.xwiki.org/xwiki/bin/view/documentation/xs/admin/installation/methods/install-xwiki-war/configure-servlet-container/)
- **Tutorial** (verb-led, more specific / end-to-end than a How-to):
  - [Create an npm package](https://www.xwiki.org/xwiki/bin/view/documentation/xs/dev/front-end/create-npm-package/) (Developer)
  - [Set up NginX Proxy Server](https://www.xwiki.org/xwiki/bin/view/documentation/xs/admin/installation/http-reverse-proxy/nginx-key-configurations/set-nginx/) (Administrator)
- **Reference** (noun-phrase title, tables, concise, code for APIs):
  - [Realtime Edit Actions](https://www.xwiki.org/xwiki/bin/view/documentation/xs/user/base/page/edit-page/realtime-edit-actions/)
  - [Ways to Resolve Edit Conflicts](https://www.xwiki.org/xwiki/bin/view/documentation/xs/user/base/page/edit-page/resolve-conflict-page/ways-resolve-edit-conflicts/)
  - [Blob Store API](https://www.xwiki.org/xwiki/bin/view/documentation/xs/dev/store/blob/)
- **Explanation** (noun-phrase title, answers "why", concepts/limitations/consequences):
  - [Class Page Deletion](https://www.xwiki.org/xwiki/bin/view/documentation/xs/user/base/page/refactoring-operations-pages/delete-page/class-page-deletion/)
  - [Comments Tab in Page Extra Area](https://www.xwiki.org/xwiki/bin/view/documentation/xs/user/base/page/view-page/comments-tab/)

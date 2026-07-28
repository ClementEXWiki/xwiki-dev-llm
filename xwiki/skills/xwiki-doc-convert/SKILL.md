---
name: xwiki-doc-convert
description: Convert OLD XWiki documentation into the new xwiki.org documentation tree. Old documentation = pages under https://www.xwiki.org/xwiki/bin/view/Documentation/ and all extension pages under https://extensions.xwiki.org/xwiki/bin/view/Extension/ (the Extensions wiki). New documentation = https://www.xwiki.org/xwiki/bin/view/documentation/ (and pages nested under it). Use when migrating/refactoring a legacy page (or an extension page) into the new tree — treating the legacy content as source material, re-classifying it by Diataxis type, dropping obsolete content, and verifying nothing useful was lost. For authoring/reviewing a page that is already in the new tree, use xwiki-doc-writing instead.
---

# Converting old documentation into the new documentation

The goal is to move **all** old documentation into the new tree:

- **Old documentation** — pages under https://www.xwiki.org/xwiki/bin/view/Documentation/ (the old
  `Documentation` space) and every extension page under
  https://extensions.xwiki.org/xwiki/bin/view/Extension/ (the Extensions wiki, a different wiki).
- **New documentation** — https://www.xwiki.org/xwiki/bin/view/documentation/ and the pages nested
  under it.

Conversion is **not** a like-for-like rewrite. Treat the legacy page as **source material**, not as
the target structure: extract the still-useful information, update it, drop the obsolete parts, and
**re-organize it into one or more pages** that each follow the new documentation rules.

This skill builds on **`xwiki-doc-writing`** (the authoring procedure, review checklist, and live
per-type examples) and on the OKF rules in **`okf/conventions/documentation.md`** (Diataxis types,
titles/page-names, page-structure fields, style, location, versioning) plus
**`okf/conventions/documentation-migration.md`** (what to do with the *original* page once its
content has moved). Read those for the rules; this skill covers only what is specific to converting.

## Conversion flow

1. **Check for existing Change Requests** on the target first, so two people don't refactor the same
   page in parallel.
2. **Read the legacy page in source mode** so you capture its real syntax, links, macros and version
   notes (not just the rendered text). For an **e.x.o extension page** the page content is empty and
   the documentation lives in xobject xproperties — **enumerate every xproperty of every xobject and
   filter for prose**, never just `description`. `installation` and `compatibility` routinely hold
   mandatory steps and prerequisites that appear nowhere else, and missing them is invisible later:
   the "nothing lost" verification below would compare against your incomplete extraction and pass.
   The field-by-field table is in `okf/conventions/documentation-migration.md`.
3. **Decompose by Diataxis type.** A legacy page usually mixes types — some explanation, a procedure
   or two, a configuration reference, maybe a tutorial. Identify each distinct piece and its type and
   audience. Do **not** keep the mixed structure.
4. **Split into target pages** — one page per How-to, one per Explanation, one per Reference topic,
   and a separate Tutorial whenever an end-to-end scenario exists. Splitting is preferred over a long
   mixed page. Merge only when several legacy pages describe a single coherent topic.
5. **Choose the location** for each target page in the new tree (most relevant existing
   topic/subtopic for its audience and type).
6. **Rewrite each page** with the `xwiki-doc-writing` flow — correct title/page-name, page-structure
   fields, style, and latest-version perspective.
7. **Update while converting** — remove obsolete information; update deprecated terminology, UI
   names, and configuration examples; convert version-specific notes to the `{{version}}` macro and
   drop notes for versions no longer supported. **Never silently lose still-valid information.**
8. **Move the attachments too, by the new tree's rules** — images and videos are content. Re-upload
   them under **kebab-case, lowercase-extension** names, insert images with `{{image}}` + `alt`, and
   **re-encode a video to `webm` and display it with `{{embed}}`**. When the legacy page *embedded* a
   video or an image, the new page **embeds it too**: turning an embed into an `attach:` link is a
   silent regression that no check catches. See `okf/conventions/documentation.md`.
9. **De-duplicate across the pages you produced** — splitting one legacy page into several is exactly
   what breeds duplication, because each new page wants to restate the context the legacy page stated
   once. Do the cross-page comparison pass from `xwiki-doc-writing` before declaring the conversion
   done, hub prose included.
10. **Handle the original page** — after the content is moved, follow the guide's
    [Handle Original Documentation Pages](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/HandleOriginalDocumentationPages/)
    steps: strip the prose (leaving a link to the new location / adding the "Documentation" button),
    then the two steps that outlive the prose and are the ones actually forgotten —
    **delete the page's leftover attachments** and **triage and repoint its backlinks**. Both
    procedures, including how to prove an attachment is safe to delete and which backlinks to leave
    alone, are in `okf/conventions/documentation-migration.md`.
11. **Save** each new page via a **Change Request** — a conversion is a major change. Group the new
    pages and the original-page edits into the **same** Change Request where they belong to one
    conversion, so a reviewer sees the move whole. (The minor-change exception in
    `okf/conventions/documentation.md` does not apply to a conversion.)

Refs: [Migrate and Refactor Documentation](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/),
[Handle Original Documentation Pages](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/HandleOriginalDocumentationPages/).

## Verify the conversion

A conversion is only correct if the new pages preserve the legacy page's meaning and useful content.
After rewriting, verify against the legacy source — comparing legacy → new — and report issues with a
**severity** (Critical / Major / Minor / Suggestion), a **location** (page + section), the
**problem**, and a **recommendation**:

- **Nothing useful lost** — every still-relevant concept, prerequisite, warning, limitation,
  configuration detail, example and troubleshooting note from the legacy page is present somewhere in
  the new pages. (Ignore genuinely obsolete/deprecated/unsupported content — that is meant to be
  dropped.)
- **Meaning preserved** — the rewrite did not change what the feature does, its requirements, or the
  relationships between features; nothing was over-simplified into being wrong.
- **Up to date** — no obsolete UI names, deprecated terminology, removed features, or references to
  unsupported versions survive; the `{{version}}` macro is used correctly.
- **Diataxis respected** — each new page is exactly one type; no procedures inside an Explanation, no
  conceptual essays inside a How-to, no configuration tables inside a Tutorial.
- **Placement & splitting** — content sits on the right page; a page covering several unrelated
  topics/goals should be split further; over-fragmented pages on one coherent topic should be merged.
- **Nothing duplicated** — no fact appears on two of the new pages, or in both a page's intro and its
  own FAQ, however differently phrased. This is the check the split most often fails, and the one that
  cannot be done page by page.
- **Attachments carried over faithfully** — every image/video is on the new page, under a conforming
  name, and **displayed the way the legacy page displayed it** (an embed stays an embed).
- **Original page finished** — prose stripped, "Documentation" button set, **attachments deleted**,
  **backlinks triaged**. A conversion that stops at the new pages is not done.
- **Guideline compliance** — titles, page names, page-structure fields and style follow
  `okf/conventions/documentation.md` (reuse the `xwiki-doc-writing` review checklist).

Do **not** raise a finding merely because you would have phrased something differently: every finding
must be justified by lost information, changed meaning, outdated content, a Diataxis violation, a
documentation-guideline violation, or a concrete usability/maintainability problem.

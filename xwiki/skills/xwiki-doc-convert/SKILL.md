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
titles/page-names, page-structure fields, style, location, versioning). Read those for the rules;
this skill covers only what is specific to converting.

## Conversion flow

1. **Check for existing Change Requests** on the target first, so two people don't refactor the same
   page in parallel.
2. **Read the legacy page in source mode** so you capture its real syntax, links, macros and version
   notes (not just the rendered text).
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
8. **Handle the original page** — after the content is moved, follow the guide's
   [Handle Original Documentation Pages](https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/MigrateDocumentation/HandleOriginalDocumentationPages/)
   steps (leave a link to the new location, rename the extension page / add the "Documentation"
   button as described).
9. **Save** each new page via a Change Request.

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
- **Guideline compliance** — titles, page names, page-structure fields and style follow
  `okf/conventions/documentation.md` (reuse the `xwiki-doc-writing` review checklist).

Do **not** raise a finding merely because you would have phrased something differently: every finding
must be justified by lost information, changed meaning, outdated content, a Diataxis violation, a
documentation-guideline violation, or a concrete usability/maintainability problem.

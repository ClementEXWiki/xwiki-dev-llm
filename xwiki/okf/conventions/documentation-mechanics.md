---
title: Programming against the xwiki.org documentation tree
stability: durable
summary: Where the xwiki.org Documentation application stores its data and how to act on it — the
  three DocApp xobjects (structure fields, Technical ID, and the quality checker's violations), how to
  read the checker's real findings instead of guessing at the red banner, how navigation order is
  pinned via the parent space's WebPreferences page, and the hidden-fragment pattern behind the
  {{display}} macro. The authoring *rules* live in [[documentation]]; the generic REST calls live in
  the `xwiki-rest-api` skill.
sources:
  - https://www.xwiki.org/xwiki/bin/view/documentation/extensions/user/documentation/create-documentation-page/page-structure/
  - https://dev.xwiki.org/xwiki/bin/view/Community/DocGuide/DocumentationNavigationTree/
---

# Programming against the xwiki.org documentation tree

Companion to [[documentation]], which holds the authoring rules. This file holds the **mechanics**: what
the Documentation application stores, and where. It is what you need when editing xwiki.org pages
programmatically (over REST — see the `xwiki-rest-api` skill for the calls themselves) or when
diagnosing why a page renders a warning.

## The DocApp xobjects on a documentation page

| Class | What it holds |
|-------|---------------|
| `DocApp.Code.DocumentationClass` | The Diataxis `type` and `target` audience, plus the page-structure fields (`faq`, `highlights`, `related`) |
| `DocApp.Code.DocumentationExtensionClass` | The **Technical ID** (`id` property), empty when no extension applies (e.g. installation pages) |
| `DocApp.Code.DocumentationViolationClass` | **One object per problem** found by the doc-quality checker; present only when the page has violations |

A documentation page carries the **first two**, and a newly created one needs **both** — a page missing
the `DocumentationExtensionClass` object is incomplete even though nothing visibly breaks.

For the exact allowed values of `type` and `target`, and what each structure field means, see
[[documentation]]. Read them from the class definition rather than assuming:
`GET /rest/wikis/xwiki/classes/DocApp.Code.DocumentationClass`.

**Trap:** `DocApp.Code.DocumentationClass` defines its **own unused `content` property**, distinct from
the page content. Merging object properties into the same structure as page data will **clobber the page
content** — keep them separate.

## Reading the doc-quality checker's actual findings

A page failing the checker renders a generic red banner that **never says what is wrong**. The findings
are stored as `DocApp.Code.DocumentationViolationClass` objects **on the page itself**: list the page's
objects, then read each violation's `context` / `message` / `severity`. That turns an opaque banner into
e.g. `context = "Image reference : "`, `message = "Use the Image macro instead."` — which is usually
enough to identify the offending line immediately (here, one of the syntax traps in [[documentation]]).

**Re-saving corrected content clears the objects automatically** — they need no manual cleanup.

## How navigation order is pinned

The *rules* for choosing an order (and when pinning is mandatory) are in [[documentation]]. The storage:

Pinning is **not** an object on the page's own `WebHome`. It is the
**`XWiki.PinnedChildPagesClass.pinnedChildPages`** property on the **`WebPreferences`** page of the
*parent* space — a single `|`-separated string whose entries carry a **trailing `/`**:

```
child-a/|child-b/|child-c/
```

Two traps:

- **A space may have no `WebPreferences` page at all** — notably, a **renamed space does not get one**.
  Then there is nothing to update and it must be **created first** (`hidden`, title *Page
  Administration*) before the pinning object can be added. Corollary for restructures: `WebPreferences`
  is a child page too, so a move that does not preserve children **leaves it behind**, and any page left
  in a space keeps that space in the navigation tree — an old branch can go on rendering with every
  `WebHome` gone.
- **Verify through the tree service, not the stored value.** The navigation panel is a Document Tree
  macro; ask it what it will display:
  `/xwiki/bin/get/XWiki/DocumentTree?outputSyntax=plain&data=children&id=document:xwiki:<ref>`
  returns the children **in display order**. Reading the stored string back only proves it was stored.
  **The REST view of a tree is not the reader's view of it.**

## Hidden fragment pages (the `{{display}}` pattern)

[[documentation]] requires that shared content exist once and be displayed elsewhere rather than copied.
The implementation: the fragment is an ordinary **hidden page nested inside one of the consuming pages**.

- `hidden` is a plain page field, not an object — no extra xobject is needed to hide it.
- A fragment carries **no** `DocumentationClass` / `DocumentationExtensionClass` objects: it is not a
  documentation page in its own right and must not appear as one.
- In `{{display reference="…"}}`, the reference takes **no `doc:` prefix**.
- Displayed headings **keep their level** inside the host page's field, so author the fragment at the
  level it will be consumed at.

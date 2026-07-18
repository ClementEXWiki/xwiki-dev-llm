---
title: JIRA (jira.xwiki.org) — access and issue-field conventions
stability: durable
summary: How to reach the self-hosted XWiki JIRA (jira-cli or REST) and the durable conventions for
  an issue's Component, Affects Version/s and Fix Version/s. Version values themselves are volatile.
sources:
  - https://dev.xwiki.org/xwiki/bin/view/Community/VersioningAndReleasePractices/
  - https://dev.xwiki.org/xwiki/bin/view/Community/SupportStrategy/
---

# JIRA (`jira.xwiki.org`)

`https://jira.xwiki.org` is XWiki's issue tracker (NOT GitHub Issues) — a **self-hosted Atlassian
JIRA** (Server/Data Center, not Cloud). There is **no MCP** for it. Two access paths, both driven by
the **`xwiki-jira`** skill (that skill owns the *procedure*; this file owns the *facts*):

- **`jira-cli`** (recommended) — `jira issue view/create/list/move/comment …`. Setup is in the
  plugin README (on-premise install: `JIRA_API_TOKEN` = your JIRA personal access token,
  `JIRA_AUTH_TYPE=bearer`, then `jira init` → installation type *Local*, server
  `https://jira.xwiki.org`, auth type *bearer*).
- **REST API** (fallback when `jira-cli` is not installed) — the same
  `JIRA_API_TOKEN` as a bearer token:
  `curl -H "Authorization: Bearer $JIRA_API_TOKEN" https://jira.xwiki.org/rest/api/2/…`.

## Project keys

Each repo has its own key: `XWIKI` (Platform), `XCOMMONS` (Commons), `XRENDERING` (Rendering); other
`xwiki`-org repos have their own keys too (e.g. `XDOCKER` for the `xwiki/xwiki-docker` image); and
each xwiki-contrib extension has a per-extension key. Always reference an issue by its key
(`XWIKI-12345`); the commit that fixes it carries that key as its prefix (see [[commit-messages]]).

## Issue-field conventions (creating a Bug)

These field conventions are **durable**; the version *values* they resolve to are volatile (see
below). When filing/curating a bug, set:

- **Component/s** — always set at least one (e.g. `REST`, `Rendering`, `Platform - …`). Required for
  triage; do not leave empty.
- **Affects Version/s** — the **oldest** released version in which the bug is present. When the buggy
  code is ancient and pinning the exact oldest release is impractical/too slow, fall back to the
  **last (most recent) XWiki LTS version that the issue affects**. **Never** just use the latest
  released version — that understates the range and defeats backport triage.
- **Fix Version/s** — the version the fix ships in: normally the next release of the current dev
  version. Note the naming: JIRA version names use dashes (e.g. `18.7.0-rc-1`), whereas the source
  `@since` / `@Deprecated(since=…)` tag for the *same* release uses `18.7.0RC1` — see [[versioning]]
  for the tag format. Add the stable-branch fix versions too when the fix is backported.

These conventions target the core projects (`XWIKI`, `XCOMMONS`, `XRENDERING`). **Some projects
configure fewer fields** — e.g. `XDOCKER` has **no Component/s, no Affects Version/s and no Fix
Version/s** at all, so there is nothing to set there; do not treat their absence as a mistake to
correct. Check what the project actually exposes before insisting on a field.

Write the **description in JIRA wiki markup** (`h2.`, `{{monospace}}`, `*bold*`, `* bullet`) and make
it explain the **user-visible problem**, not just the code change — but mind the angle-bracket gotcha
below.

## Wiki-markup gotchas (descriptions and comments)

Both descriptions and comments are rendered with the **JIRA wiki renderer**, which treats `<…>` as
**HTML and silently strips unknown tags**. This bites any content with angle brackets — XML/HTML
snippets, generics, `sed` expressions, placeholders like `<version>`:

- **Inline `{{monospace}}` does NOT protect angle brackets.** `{{<id>}}` renders as empty `{{}}` —
  the `<id>` is eaten as an HTML tag. Same for `<version>`/`<variant>` written in prose.
- **Put anything containing `<` or `>` in a `{code}` or `{noformat}` block**, never in prose or inline
  `{{…}}`. Inside those blocks the brackets are preserved (HTML-escaped to `&lt;`/`&gt;`), so a `sed`
  command like `s/…-war</…-docker</` survives intact. This is exactly how well-formed descriptions do
  it — mirror the reporter's existing `{noformat}`/`{code}` blocks.
- Reserve `{{monospace}}` for bracket-free tokens (identifiers, file paths, method names).

**Editing a comment** (e.g. to fix a mis-rendered one) is REST-only — `jira-cli` cannot edit
comments: `PUT /rest/api/2/issue/{KEY}/comment/{ID}` with JSON `{"body": "…"}`. **Verify the result**
by fetching `GET …/comment/{ID}?expand=renderedBody` and checking the brackets survived in the
rendered HTML, rather than trusting the source you sent.

## Identifying the current LTS (for the Affects-Version fallback)

XWiki dev runs in yearly **cycles** `X.0 → X.10`; the final **`X.10`** line of the **last completed**
cycle is the current LTS (the in-progress cycle's `.10` does not exist yet), and the previous cycle's
`X.10` typically still gets overlap patches. So while dev is on `18.x`, the current LTS is the
`17.10` line. This mapping is **volatile** — verify, do not cache the number.

## Verifying the volatile values

- **Current dev version** (drives Fix Version) → read the repo root `pom.xml` `<version>`, or SNAPSHOT
  jar names under `~/.m2` / nexus (see [[index]] and [[versioning]]).
- **Which JIRA version names exist / are released** →
  `GET https://jira.xwiki.org/rest/api/2/project/XWIKI/versions` (each entry has `released` and
  `releaseDate`); the latest released feature line and the current LTS are read from there.
- **Support strategy / which lines are supported LTS** → WebFetch the `sources:` SupportStrategy page.

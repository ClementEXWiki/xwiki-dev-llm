---
title: XWiki OKF — index / map
stability: durable
summary: Entry map of the XWiki LLM knowledge base. Lists every topic with a one-line summary and
  says how to read and how to extend the corpus.
---

# XWiki OKF — index / map

The **OKF** is the curated, LLM-oriented knowledge base for developing XWiki platform code and
xwiki-contrib extensions. It holds **declarative** knowledge (conventions, architecture, the dev
server ecosystem, processes). **Procedures** ("how to do task X") live in the `xwiki-*` skills, not
here. A slimmed copy of this map is injected into every XWiki session via
`instructions/xwiki-org.md`; this file is the navigable, full version.

## How to use the OKF (READ)

1. Find the relevant topic in the map below and **Read that file**.
2. Check the file's `stability:` frontmatter:
   - `durable` → the inline content is the answer.
   - `volatile` → **do not trust any value written here**; follow the `verify:` recipe (read
     `pom.xml`, use the `sonarqube`/`discourse` MCP, or WebFetch the listed dev-wiki source).
3. For repeated lookups of the same external page in a session, index it once with context-mode (if
   installed) and search — but the OKF never *requires* context-mode.

The full how-to-read-and-extend protocol is the `xwiki-knowledge` skill.

## Topics

### conventions/
- **code-style** — line length (120), LGPL headers, component system, javax→jakarta, `-legacy` rules.
- **code-comments** — comment about the code as-is; never reference history or transient links.
- **commit-messages** — JIRA-key prefix (`XWIKI-12345:`) or `[Misc]`.
- **versioning** — `@since`/`@Deprecated(since=…)` use `<X.Y.0>RC1`; current version is volatile.
- **backward-compatibility** — Revapi, the `@Unstable` lifecycle, evolve interfaces via default methods.
- **security** — escaping APIs, untrusted user input & translations, context-author right checks in
  script services, configurable HTML sanitizer.
- **performance** — prefer streaming over buffering; never load an unbounded payload (attachment,
  body, upload, export, query result) fully into memory.
- **documentation** — xwiki.org documentation rules: Diataxis types & audiences, title/page-name
  rules (incl. title case), how much belongs on one page (a How-to is one procedure; one fact, one
  page), page-structure xobject fields with the exact semantics of Highlights / More / Related, style,
  location, version perspective and the `{{version}}` macro, the XWiki syntax traps that silently
  mis-render (`image:`, `--`, anchors, URLs in headings), navigation-order pinning, and handling the
  original page after migration (the live Documentation Guide is the evolving source of truth).
  Applied by `xwiki-doc-writing` and `xwiki-doc-convert`.
- **documentation-mechanics** — the storage side of the above, for editing xwiki.org pages
  programmatically or diagnosing a warning banner: the three `DocApp` xobjects (structure fields,
  Technical ID, quality-checker violations), how to read the checker's real findings instead of guessing
  at the red banner, how navigation order is pinned on the parent space's `WebPreferences` page (and why
  it must be verified through the Document Tree service), and the hidden-fragment pattern behind
  `{{display}}`. The generic REST calls live in the `xwiki-rest-api` skill.

### architecture/
- **component-system** — `@Role`/`@Component`/`components.txt`, `@Inject`/`@Named` hints, instantiation.
- **macro-refactoring** — `MacroRefactoring` role (keyed by macro id) rewrites a macro's references on
  rename/move and extracts them for backlinks; `DefaultMacroRefactoring` is content-only (ignores parameters).
- **wiki-user-scope** — a subwiki's user scope (local/global/both) is stored on its own
  `WikiManager.WikiUserConfiguration` doc (not the descriptor) and defaults to `GLOBAL_ONLY` when absent.
- **solr-search** — XWiki's Solr backend: embedded by default, externalisable to a remote/standalone
  Solr which needs several pre-created cores (`search`, `extension_index`, `ratings`, `events`, named
  `xwiki_<core>_<solrMajor>`); configured via `solr.type=remote` + `solr.remote.baseURL`; the search
  core needs Solr's `analysis-extras` module.

### testing/
- **strategy** — test kinds & naming, no-stdout rule, lightest-base rule, `@Order` source-ordering rule, don't-pay-the-timeout rule, reading a PRChecker log line, coverage, framework locations.

### servers/
- **index** — the xwiki.org server ecosystem (JIRA, CI, Nexus, SonarCloud, forum, …) and how to
  access/verify each (MCP vs. WebFetch); plus writing via REST (only `/rest` honors Basic auth, the
  `XWiki-Form-Token` CSRF header, and the `extensions` subwiki id).
- **jira** — accessing jira.xwiki.org (jira-cli or REST), the durable issue-field conventions
  (Component, Affects Version = oldest affected/else last LTS, Fix Version); values are volatile;
  resolving/closing (Fixed vs. Cannot Reproduce for already-covered issues, assign to yourself); and
  wiki-markup gotchas (wrap literals in `{{…}}`, don't over-escape prose, never escape inside `{code}`).

### processes/
- **release** — how XWiki versions/releases (Commons+Rendering+Platform together); detailed steps are
  volatile pointers to the dev wiki.
- **security-policy** — CVSS-4 severity scoring (volatile; verify) and the durable rule never to
  reveal a vulnerability publicly until disclosure (obfuscated commits, restricted JIRA issues).

### decisions/ (ADRs)
Architectural Decision Records — the *why* behind durable choices (context, decision, consequences),
each grounded in a cited source. `_template.md` holds the format and the grounding rule.
- **check-binary-not-source-compatibility** — why Revapi enforces binary/semantic but not source
  compatibility.

## Related skills (procedures, not knowledge)

`xwiki-build`, `xwiki-pull-request`, `xwiki-javadoc`, `xwiki-test-guidelines`, `xwiki-convert-tests`,
`xwiki-convert-tests-docker`, `xwiki-fix-flickering-docker-test`, `xwiki-increase-test-coverage`,
`xwiki-legacy`, `xwiki-deploy-extension`, `xwiki-rest-api`, `xwiki-xar-pages`, `xwiki-doc-writing`, `xwiki-doc-convert`, `xwiki-translations`,
`xwiki-contrib-release-blog-post`, `xwiki-fix-sonarqube-issue`, `xwiki-backport`,
`xwiki-backport-testneeded`, `xwiki-jira`.

## How to extend the OKF (EXTEND)

New knowledge enters **only through a reviewed git PR** — never silent local writes. Use the
`xwiki-knowledge` skill, which runs the gate checklist (durable? generic/de-personalised? not a
secret or machine-specific detail? not already present?) and drafts a correctly-formatted entry.
When you add a topic, **update this map and the mirror in `instructions/xwiki-org.md`**.

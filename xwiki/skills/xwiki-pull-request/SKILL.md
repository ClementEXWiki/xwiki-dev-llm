---
name: xwiki-pull-request
description: Create a GitHub pull request for an XWiki repo (xwiki-platform, xwiki-commons, xwiki-rendering, xwiki-contrib). Use when opening a PR, writing a PR description, or preparing commits for a PR in an XWiki project.
---

# Creating an XWiki pull request

## Commit messages & PR title

- Reference the JIRA issue, and make the summary line **the issue's title, verbatim** rather than a
  description you compose: `XWIKI-NNNNN: <the JIRA issue title>` (use `XCOMMONS-NNNNN:` in
  xwiki-commons, `XRENDERING-NNNNN:` in xwiki-rendering). Put what the commit actually does in the
  body, as `*` bullets. See `okf/conventions/commit-messages.md`.
- For trivial changes that do not warrant a JIRA issue, prefix with `[Misc] <description>`.
  Do not create unnecessary JIRA issues
  (see https://dev.xwiki.org/xwiki/bin/view/Community/DevelopmentPractices).
- Keep **one squashed commit per issue** — the backport automation only works with a single commit.
- When the change was authored with AI assistance, add AI attribution: a `Co-Authored-By: Claude
  <model> <noreply@anthropic.com>` trailer on the commit and a "Generated with Claude Code" line in
  the PR body.

## PR description — always use the template

Fill `.github/pull_request_template.md` (at the repo root). Complete every section meaningfully:

- **Jira URL** — link the JIRA issue (omit only for `[Misc]` PRs).
- **Changes → Description** — the main changes.
- **Changes → Clarifications** — choices made, links to forum proposals / dependent issues.
- **Screenshots & Video** — before/after for any UI change.
- **Executed Tests** — how the change was validated (the `mvn` commands run). Especially important
  for regression fixes.
- **Expected merging strategy** — `Prefers squash: Yes`; list backport branches if any.

## Labels, assignees, branches

- Add `backport stable-xxx` labels to trigger automated cherry-pick PRs onto release branches.
- Assign the committer who will do the final merge; ping reviewers for parts outside their
  expertise. Dependency-upgrade PR default assignees: webjar Maven → @mflorea,
  non-webjar Maven → @tmortagne, npm → @manuelleduc.
- Reserved branch names: `master`/`main`, `stable-xxx`. Cross-repo changes use a shared
  `feature-deploy-xxx` branch in each repo.

## Before opening

- Prove the build is green locally (see the `xwiki-build` skill).
- Create the PR with the `gh` CLI (e.g. `gh pr create`), using the template body.

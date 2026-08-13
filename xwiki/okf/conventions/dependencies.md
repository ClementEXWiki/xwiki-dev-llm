---
title: Accepting a new third-party dependency
stability: durable
summary: The checklist a third-party project must pass before it can be added to an XWiki
  distribution — license (non-negotiable), longevity, release cadence, support responsiveness, active
  contributors, documentation, security; a VOTE can waive everything but the license.
sources:
  - https://dev.xwiki.org/xwiki/bin/view/Community/DevelopmentPractices#HAddinganewDependency
---

# Accepting a new third-party dependency

Before adding a dependency to an XWiki distribution, check the project against **all** of:

- **License** compatible with XWiki's LGPL 2.1 and OSI-approved — *non-negotiable*.
- **Longevity** > 2 years, and versions numbered properly.
- **Release cadence** several times a year (once a year is acceptable only with a > 3-year track
  record of it).
- **Support**: questions actually get answered, usually within a month.
- **Active contributors**, not a one-person effort: **≥ 3** when the dependency provides an important
  feature (ideally not all from the same company), **≥ 1** for a secondary feature.
- **Documentation** exists.
- **No known important, unhandled security issue.**

If a criterion fails (or is doubtful) and there is no alternative, a **VOTE** can grant an exception
for that dependency — except for the license criterion.

Upgrading dependencies is a separate flow: upgrade PRs (including Renovate's) have per-ecosystem
default assignees — see the `xwiki-pull-request` skill.

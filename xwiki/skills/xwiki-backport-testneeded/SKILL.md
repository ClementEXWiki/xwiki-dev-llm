---
name: xwiki-backport-testneeded
description: Backport the automated tests of JIRA issues labelled `testneeded` to the currently-supported stable branches, adjust their `@since` tags across all branches, and open the PRs. Use when asked to backport testneeded tests, catch up a stable branch with recently-added tests, or process the `testneeded` backport queue. For the Maven/build commands use xwiki-build; for PR/commit conventions use xwiki-pull-request; for the `@since` versioning rules use xwiki-knowledge.
---

Backport the tests added for `testneeded`-labelled JIRA issues onto the currently-supported stable
branches, keep `@since` tags consistent across every branch, and open one PR per branch. The work is
highly parallelizable — run one subagent per issue, each in its own git worktree.

Related skills: **xwiki-build** (Maven), **xwiki-pull-request** (PR/commit conventions),
**xwiki-knowledge** (the `@since` / versioning convention lives in the OKF).

## 0. Inputs you must establish first

- **Which stable branches are supported right now.** Ask the user, or infer from the last patch
  release of each active line. Do NOT hardcode — they change every release. Example at time of
  writing: `stable-17.10.x` and `stable-18.4.x`.
- **The next patch version of each stable branch** and the current master dev version — read them
  from each branch's root `pom.xml` `<version>` (a `-SNAPSHOT` value like `17.10.10-SNAPSHOT` means
  the next release is `17.10.10`). Needed for `@since`.
- **The release dates / branch-cut points** (JIRA `GET /rest/api/2/project/XWIKI/versions`) so you
  can tell whether a fix already shipped in a branch.

## 1. Get the issue list (JIRA)

JQL (adjust the date to the window you want), via the REST API so you get structured data:

```
labels = testneeded AND resolution = Fixed AND resolutiondate >= <YYYY-01-01> ORDER BY resolved ASC
```
`curl -s "https://jira.xwiki.org/rest/api/2/search?jql=<urlencoded>&maxResults=200&fields=key,summary,resolutiondate,fixVersions"`.
(Network calls that get redirected under context-mode: run them via `ctx_execute`/`ctx_fetch_and_index`.)

## 2. Decide, per issue, which branches need a backport (from `fixVersions`)

For each issue, the fix is ALREADY on a branch if it shipped in a version that branch contains:
- **Skip `stable-17.10.x`** if the issue already has a `17.10.x` fixVersion.
- **Skip `stable-18.4.x`** if the only 18-line fixVersion is `<= 18.4` (e.g. `18.3.0-rc-1`) — it was
  already included when 18.4.0 branched. Only backport to 18.4.x when the 18-line fixVersion is
  `>= 18.5.0` (i.e. landed on master after the 18.4.x branch cut).
- Generalise: an issue needs branch B only if its fix landed **after** B was cut and is **not**
  already released on B's line.

## 3. Find ALL commits for each issue

`git log origin/master --oneline --grep=<KEY>` — an issue often has **several** commits (initial
test + follow-up fixes). Cherry-pick them **all**, **oldest-first**, with `-x`. Keys can be
`XWIKI-`, `XCOMMONS-`, `XRENDERING-` (those last two live in the commons/rendering repos, which have
their own stable branches).

## 4. Dry-run the cherry-picks before committing to the work

For each (issue, branch), attempt the cherry-pick in a throwaway detached worktree and record
CLEAN vs CONFLICT (and the conflicting files). This tells you the real shape up front. Note:
`git cherry-pick`'s conflict list does not distinguish a content conflict from a **modify/delete**
conflict — the latter means the file/module does not exist on the branch (see §6, structural
blockers).

## 5. Do the backports (one subagent per issue, isolated worktree)

Branch name: `backport/stable-<X>/XWIKI-nnnnn` pushed to `origin` (a committer has push access;
this matches the auto-backport bot's `backport/stable-<X>/pr-<n>` scheme). One PR per branch:

```
gh pr create --repo xwiki/xwiki-platform --base stable-<X> --head backport/stable-<X>/XWIKI-nnnnn \
  --assignee <you> --label testneeded \
  --title "[stable-<X>] XWIKI-nnnnn: <original summary>" --body "<what/why + cherry-picked SHAs>"
```
Create the `testneeded` GitHub label once if it does not exist (`gh label create testneeded ...`).

Give each subagent: the ordered commit SHAs, the target branch(es), and the dry-run conflict hints.
Tell it to keep its own context lean (pipe verbose output to `| tail`; inspect only conflicted hunks)
and to return a terse per-branch result (clean / resolved(files) / aborted(reason) + PR URL).

## 6. Conflict-resolution rules (the important part)

These are test-only changes, but naive resolution is wrong. Rules that matter:
- **Test-suite aggregators (`AllIT.java`) and `@Nested` class lists**: add the new test class
  alongside existing entries — but do NOT pull in sibling classes that exist only on master (e.g. a
  `NestedEditingIT extends EditingIT` when `EditingIT` isn't on the branch) — that breaks
  compilation.
- **A raw conflict can span methods from OTHER issues.** When the branch lacks unrelated helper
  methods/overloads, a literal "keep both sides" pulls in code that won't compile. Add **only** the
  method(s) the current commit introduces; verify every page-object API the new test calls actually
  exists on the branch.
- **New module `pom.xml` brought in by the commit**: set its parent `<version>` to the **target
  branch** version (e.g. `17.10.10-SNAPSHOT`), not the master version it was cherry-picked with.
- **Style divergence** (e.g. branch uses `Arrays.asList(...).stream()` where master switched to
  `Stream.of(...)`): keep the branch's style, apply only the commit's semantic change.
- A backport that reproduces the original commit's `--stat` (files/insertions) is a strong
  correctness signal.
- **Structural blockers → abort, do not force.** If the test depends on a whole module or file that
  is new in a later release and absent on the branch (surfaces as a **modify/delete** conflict),
  backporting it means dragging that infrastructure onto the stable branch. That is a maintainer
  decision — abort that branch, report exactly what's missing (and any prerequisite issue that would
  have to be backported first), and leave it for manual handling.
- Independent backport PRs that touch the **same** file on the same branch will conflict with each
  other at merge time (the second to merge needs a rebase). Flag this; it's expected.

## 7. Adjust `@since` on every branch (and master)

Backporting makes new **public** API (mainly page objects under a `*-test-pageobjects`
`src/main/java`) available in each branch's next release, so `@since` must list those versions, and
**master must match so all branches carry identical `@since` content**. IT test classes
(`src/test/**IT.java`) are not API — they get no `@since`.

Convention (see `xwiki-knowledge`): one `@since` line per version-line, **ascending**, e.g.
`@since 17.10.4` then `@since 18.2.0RC1`. Patch releases are plain (`17.10.10`); `.0` releases use
the RC form (`18.5.0RC1`).

**Decide the lines to add EMPIRICALLY per element** (do not assume a fixed block):
- Find the element's existing original `@since` on master and KEEP it.
- If the element is **absent** on `origin/stable-17.10.x` → add `@since 17.10.10`.
- If **absent** on `origin/stable-18.4.x` (and the issue was backported there) → add `@since 18.4.3`.
- If it already exists on a branch, do NOT add that branch's line. If it exists on **both** (its
  `@since` predates both branch cuts, e.g. `17.4.0RC1`) → nothing to add; skip it.
- A brand-new class carries one class-level `@since` and its members inherit it — annotate the class,
  not every member. A new public method with no javadoc gets a minimal javadoc + the line(s).

Apply the identical edit on: each backport branch (an extra commit on the existing PR branch — it
updates the PR) **and** master. On **master**, produce **one PR** with **one commit per issue**, each
commit's subject = the **original commit title**, body noting the `@since` was adjusted. Assemble it
by having each subagent also push a per-issue `since/master/XWIKI-nnnnn` branch, then cherry-pick
those single commits onto one branch (they touch disjoint files → no conflicts), push, open the PR,
and delete the intermediate branches.

## 8. Verify

The user chooses the depth. **CI on each PR runs the tests** on real infrastructure — that is the
authoritative check. To also run one locally as a demo, use the `xwiki/build` DockerHub image
(github.com/xwiki/xwiki-docker-build), mounting the docker socket (Docker-out-of-Docker) and your
`~/.m2` (settings.xml with the XWiki repos + cached artifacts):

```
docker run --rm [--platform linux/amd64] \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v <worktree-on-backport-branch>:/root/xwiki-platform -v $HOME/.m2:/root/.m2 \
  --entrypoint /bin/bash xwiki/build -c "cd /root/xwiki-platform/<test-docker-module> && \
    /home/hudsonagent/maven/bin/mvn -B -ntp verify -Plegacy,integration-tests,docker,snapshot \
      -Dit.test=<TheIT> -Dxwiki.checkstyle.skip=true -Dxwiki.surefire.captureconsole.skip=true \
      -Dxwiki.revapi.skip=true -Dxwiki.enforcer.skip=true -Dxwiki.license.skip=true"
```
**Gotcha:** building only the leaf `test-docker` module fails to compile the backported test,
because the sibling `*-test-pageobjects` module (which holds the newly-added page-object API) is
pulled as a *published* dependency (Nexus / `~/.m2`) that does not contain the new class. First
`install` the changed page-object module(s) from the branch (`mvn install -DskipTests` in that module,
or run from the reactor root with `-pl <test-docker-module> -am`), then run the IT. CI builds the
full reactor so it doesn't hit this.

Caveats: the image is **amd64-only** — on Apple-silicon it runs under emulation AND spins up more
emulated amd64 containers (XWiki+DB+Selenium) per test, so a single run is slow/flaky and running
the whole set locally is impractical. Prefer CI for the full set; use the local run only to prove the
mechanism. See **xwiki-fix-flickering-docker-test** if the test itself flickers.

## Orchestration & cost notes
- One subagent per issue, `isolation: worktree`, so parallel git operations don't collide. Batch to
  bound disk (each worktree is a full checkout) and to avoid exhausting session/token limits — the
  main thread and subagents share the budget. ~5 concurrent is a safe batch size.
- Checkpoint progress (PR numbers, per-issue branch decisions, master commit SHAs) to durable notes
  so a session reset / rate-limit pause can resume cleanly.

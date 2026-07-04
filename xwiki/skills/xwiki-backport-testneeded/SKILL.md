---
name: xwiki-backport-testneeded
description: Backport the automated test of one JIRA issue labelled `testneeded` to the currently-supported stable branches, adjust its `@since` tags across all branches, and open the PRs. Use when asked to backport the test of a given testneeded issue, or catch a stable branch up with a recently-added test. (For several issues at once, the user will say so — then apply this per issue.) For the Maven/build commands use xwiki-build; for PR/commit conventions use xwiki-pull-request; for the `@since` versioning rules use xwiki-knowledge.
---

Backport the test added for **one** `testneeded`-labelled JIRA issue onto the currently-supported
stable branches, keep its `@since` tags consistent across every branch, and open one PR per branch.

Related skills: **xwiki-build** (Maven), **xwiki-pull-request** (PR/commit conventions),
**xwiki-knowledge** (the `@since` / versioning convention lives in the OKF).

Running it for several issues at once is opt-in: only when the user asks, apply the steps below per
issue (a worktree + subagent per issue parallelises well), and consolidate the master `@since` edits
of all issues into a single master PR instead of one per issue.

## 0. Inputs you must establish first

- **The issue key** to backport (e.g. `XWIKI-nnnnn`). Keys can also be `XCOMMONS-` / `XRENDERING-`
  (those live in the commons/rendering repos, which have their own stable branches).
- **Which stable branches are supported right now.** Ask the user, or infer from the last patch
  release of each active line. Do NOT hardcode — they change every release. Example at time of
  writing: `stable-17.10.x` and `stable-18.4.x`.
- **The next patch version of each stable branch** and the current master dev version — read them
  from each branch's root `pom.xml` `<version>` (a `-SNAPSHOT` value like `17.10.10-SNAPSHOT` means
  the next release is `17.10.10`). Needed for `@since`.
- The issue's **`fixVersions`** and the version **release dates / branch-cut points**
  (JIRA `GET /rest/api/2/project/XWIKI/versions` and `.../issue/<KEY>?fields=fixVersions,summary`).
  (Network calls that get redirected under context-mode: run them via `ctx_execute`/`ctx_fetch_and_index`.)

## 1. Decide which branches need the backport (from the issue's `fixVersions`)

The fix is ALREADY on a branch if it shipped in a version that branch contains:
- **Skip `stable-17.10.x`** if the issue already has a `17.10.x` fixVersion.
- **Skip `stable-18.4.x`** if the only 18-line fixVersion is `<= 18.4` (e.g. `18.3.0-rc-1`) — it was
  already included when 18.4.0 branched. Only backport to 18.4.x when the 18-line fixVersion is
  `>= 18.5.0` (i.e. landed on master after the 18.4.x branch cut).
- Generalise: the issue needs branch B only if its fix landed **after** B was cut and is **not**
  already released on B's line. If it needs no branch, there is nothing to do.

## 2. Find ALL commits for the issue

`git log origin/master --oneline --grep=<KEY>` — an issue often has **several** commits (initial
test + follow-up fixes). Cherry-pick them **all**, **oldest-first**, with `-x`.

## 3. Dry-run the cherry-picks before committing to the work

For each target branch, attempt the cherry-pick in a throwaway detached worktree and record
CLEAN vs CONFLICT (and the conflicting files). Note: `git cherry-pick`'s conflict list does not
distinguish a content conflict from a **modify/delete** conflict — the latter means the file/module
does not exist on the branch (see §5, structural blockers).

## 4. Do the backport

Work in an isolated worktree. Branch name: `backport/stable-<X>/XWIKI-nnnnn` pushed to `origin`
(a committer has push access; this matches the auto-backport bot's `backport/stable-<X>/pr-<n>`
scheme). For each target branch: `git checkout -B backport/stable-<X>/XWIKI-nnnnn origin/stable-<X>`,
cherry-pick the commits oldest-first, resolve conflicts (§5), push, and open the PR:

```
gh pr create --repo xwiki/xwiki-platform --base stable-<X> --head backport/stable-<X>/XWIKI-nnnnn \
  --assignee <you> --label testneeded \
  --title "[stable-<X>] XWIKI-nnnnn: <original summary>" --body "<what/why + cherry-picked SHAs>"
```
Create the `testneeded` GitHub label once if it does not exist (`gh label create testneeded ...`).

## 5. Conflict-resolution rules (the important part)

These are test-only changes, but naive resolution is wrong. Rules that matter:
- **Test-suite aggregators (`AllIT.java`) and `@Nested` class lists**: add the new test class
  alongside existing entries — but do NOT pull in sibling classes that exist only on master (e.g. a
  `NestedEditingIT extends EditingIT` when `EditingIT` isn't on the branch) — that breaks
  compilation.
- **A raw conflict can span methods from OTHER issues.** When the branch lacks unrelated helper
  methods/overloads, a literal "keep both sides" pulls in code that won't compile. Add **only** the
  method(s) this issue's commit introduces; verify every page-object API the new test calls actually
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

## 6. Adjust `@since` on every branch (and master)

Backporting makes new **public** API available in each branch's next release, so `@since` must list
those versions, and **master must match so all branches carry identical `@since` content**.

Scope — what carries `@since` here (see `xwiki-knowledge` → versioning):
- **Only class-level** `@since`, and only on a **genuinely-new** test-support class (a new page
  object under `*-test-pageobjects/src/main/java`). Members inherit the class `@since`.
- **Never on methods** of page objects / test helpers — these are test-support methods and do not
  get `@since`. If the original commit added a method-level `@since`, it should not have; do not
  carry it into the backport (and it can be dropped).
- **Never invent** an `@since` where the master code did not already have one.
- IT test classes (`src/test/**IT.java`) are not API — no `@since`. If the issue adds no new
  test-support **class**, there is no `@since` work at all.

Format (durable): three numeric segments (`18.3.0RC1`, never `18.3RC1`; `17.10.10`; `18.4.3`), one
line per version-line, **ascending** by version number.

**Decide the lines to add EMPIRICALLY for the new class** (do not assume a fixed block):
- Keep the class's existing original `@since` from master.
- If the class is **absent** on `origin/stable-17.10.x` → add `@since 17.10.10`.
- If **absent** on `origin/stable-18.4.x` (and the issue was backported there) → add `@since 18.4.3`.
- If it already exists on a branch, do NOT add that branch's line.

Apply the identical edit on **each backport branch** (an extra commit on the existing PR branch — it
updates that PR) **and on master**. The master change is a **single commit whose subject = the
original commit title** (body noting the `@since` was adjusted), on a `backport/master/XWIKI-nnnnn`
branch, opened as its own master PR.

## 7. Verify

The user chooses the depth. **CI on each PR runs the tests** on real infrastructure — that is the
authoritative check. To also run the test locally as a demo, use the `xwiki/build` DockerHub image
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
emulated amd64 containers (XWiki+DB+Selenium) per test, so a single run is slow/flaky. A common
failure there is Docker-out-of-Docker networking, e.g. Testcontainers `Could not connect to Ryuk at
<ip>:<port>` (the test compiles and is discovered, then the *environment* fails to come up) — that is
an infra limitation, not a backport defect (`TESTCONTAINERS_RYUK_DISABLED=true` sometimes gets past
Ryuk, but the XWiki/DB containers may still not be reachable). Prefer CI; use the local run only to
prove the code compiles and the test is picked up. See **xwiki-fix-flickering-docker-test** if the
test itself flickers.

## Notes
- Do the work in an isolated git worktree so it doesn't disturb the current checkout.
- Checkpoint progress (branch decision, PR numbers) if the run is long, so a session reset /
  rate-limit pause can resume cleanly.

---
name: xwiki-build
description: Build and test XWiki Maven modules. Use when building XWiki, running its tests, or when the user mentions mvn, a build, a failing test, or a specific XWiki module.
---

# Building and testing XWiki

XWiki is a multi-module Maven project. Almost every build needs the `legacy` profile.

**Always pass `-B -ntp`** (batch mode + no-transfer-progress) on every `mvn` invocation. This
removes all interactive prompts and the download/progress lines that otherwise flood the output —
keep it on the commands below and on any new `mvn` command you run.

**Always start with `clean`** (`mvn clean <goal>`). XWiki builds leave generated artifacts and
per-module state behind, and stale `target/` (and locally-installed SNAPSHOTs) cause confusing,
hard-to-diagnose failures.

## Full build (fast, unit tests only — no integration tests)

```bash
mvn clean install -B -ntp -Plegacy \
  -Dxwiki.checkstyle.skip=true -Dxwiki.surefire.captureconsole.skip=true \
  -Dxwiki.revapi.skip=true
```

Without the `integration-tests` profile, `*IT.java` tests don't run. To include integration tests,
add `-Pintegration-tests` (and `-Pdocker` for the Docker-based ITs). `-DskipITs` skips ITs while
keeping unit tests; `-DskipTests` skips all tests.

> **These skip flags are for speed only.** They disable Checkstyle, API compatibility checks, and
> console-capture validation to make the full multi-module build faster. Do NOT carry them over to
> single-module builds when you need to validate code quality (e.g., before committing).

## Build a single module

```bash
mvn clean install -B -ntp -pl <module-path> -Plegacy
```

For example in xwiki-platform: `-pl xwiki-platform-core/xwiki-platform-<module>`.

This command runs Checkstyle, API compat (Revapi) and the other default checks, and is the correct
way to validate code quality before committing. Do not add the skip flags from the full build recipe
here unless you explicitly want to bypass those checks. It does **not**, however, run the JaCoCo
test-coverage check — add `-Pquality` for that (see Notes); do so whenever the change touches
production code.

## Also rebuild any legacy module that weaves the changed module

Some modules are wrapped by a `-legacy` module that re-adds deprecated/removed APIs by weaving the
original module's bytecode with AspectJ. That legacy module compiles and tests against your changed
code, so a change that builds fine on its own can still break the legacy module.

A legacy module wraps your module when its `pom.xml` configures `aspectj-maven-plugin` with a
`<weaveDependency>` whose `<artifactId>` is the module you changed. For example, a change to
`xwiki-platform-oldcore` must also be validated by rebuilding `xwiki-platform-legacy-oldcore`:

```bash
grep -rl '<weaveDependency>' --include=pom.xml   # find legacy modules and inspect their weaveDependency artifactIds
```

When such a legacy module exists, build it too (single-module build, all checks on) to confirm it
still compiles and its tests still pass:

```bash
mvn clean install -B -ntp -pl <legacy-module-path> -Plegacy
```

## Run tests

```bash
# All unit tests in a module
mvn test -B -ntp -pl <module-path>

# A single test class
mvn test -B -ntp -pl <module-path> -Dtest=MyTestClass

# A single test method
mvn test -B -ntp -pl <module-path> -Dtest=MyTestClass#myMethod

# Integration tests
mvn verify -B -ntp -pl <module-path> -Pintegration-tests
```

## Common profiles

Standardized across all XWiki projects — see
https://dev.xwiki.org/xwiki/bin/view/Community/Building/#HUsingProfiles for the full list and
definitions.

| Profile             | Purpose                                                              |
|---------------------|---------------------------------------------------------------------|
| `legacy`            | Includes backward-compatibility (`-legacy`) modules; almost always needed |
| `integration-tests` | Activates integration-test (`*IT.java`) execution via Failsafe       |
| `docker`            | Runs the Docker-based integration tests (requires Docker installed); used together with `integration-tests` |
| `quality`           | Checkstyle + Revapi + Enforcer checks, **plus the JaCoCo coverage check** (see Notes) |

## Notes

- The `legacy` profile activates backward-compatibility shim modules and is almost always required.
- Skip flags worth knowing: `-Dxwiki.checkstyle.skip=true` (Checkstyle),
  `-Dxwiki.revapi.skip=true` (API compat), `-Dxwiki.surefire.captureconsole.skip=true`
  (stdout capture check).
- Checkstyle and Revapi run in the `verify` phase (not `test`), so `mvn test` won't catch them —
  use `mvn clean verify` or `install` to validate.
- **The JaCoCo test-coverage check runs ONLY under `-Pquality`.** The `jacoco:check` goal that
  enforces each module's `xwiki.jacoco.instructionRatio` minimum is bound inside the `quality`
  profile in the parent POM — a plain `mvn clean install` (even a single-module one) never runs it.
  So **any code change must be verified with `-Pquality`** to confirm it didn't drop the module below
  its pinned coverage ratio, e.g. `mvn clean install -B -ntp -pl <module-path> -Plegacy,quality`.
  Because each module pins the ratio to its *achieved* coverage (locked in by the
  `xwiki-increase-test-coverage` skill), there is almost no slack: removing or simplifying code —
  including a mechanical SonarQube fix — can shift the covered/total instruction ratio and fail the
  check. This failure is invisible without `-Pquality` and only surfaces in CI (which builds with it).

## Reading a multi-module reactor result

- **Always run `mvn` from the repo root.** A `-pl <relative-path>` build launched from anywhere else
  fails fast with "Could not find the selected project in the reactor" — that is a path error, not a
  code error. Relaunch from the root.
- **A module failing mid-reactor SKIPS every module after it.** The modules marked `SUCCESS` before it
  in the summary are genuinely verified; the ones after were never built. After fixing or dropping the
  failing module, re-run a reactor containing the **skipped** ones — the first run did not cover them.
- **A failure unrelated to your change → drop that module, keep the rest.** Build order means a leaf
  failing last cannot taint the modules built before it, so every other `SUCCESS` stands and those
  modules need no rebuild. To tell whether a failure is yours: if `git diff --name-only` does not list
  the flagged class, it is not — confirm with `git log -1 -- <that class's file>`, which will point at
  an unrelated recent commit. A pre-existing red module on master (a Revapi failure left by an
  in-flight migration, say) fails your reactor without being your fault.
- `-am` (also-make) is only needed when a `X.Y.0-SNAPSHOT` sibling is genuinely unpublished. A
  "Could not find artifact" for a sibling is a resolution error, not a code error; otherwise SNAPSHOT
  siblings resolve from `~/.m2` or the XWiki remote repositories, and adding `-am` needlessly slows a
  `-Pquality` build by rebuilding the upstream tree.

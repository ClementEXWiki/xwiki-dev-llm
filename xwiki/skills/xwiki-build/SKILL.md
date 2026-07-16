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
mvn clean install -B -ntp -Plegacy,snapshot \
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
mvn clean install -B -ntp -pl <module-path> -Plegacy,snapshot
```

For example in xwiki-platform: `-pl xwiki-platform-core/xwiki-platform-<module>`.

This command runs all checks (Checkstyle, API compat, etc.) and is the correct way to validate
code quality before committing. Do not add the skip flags from the full build recipe here unless
you explicitly want to bypass those checks.

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
mvn clean install -B -ntp -pl <legacy-module-path> -Plegacy,snapshot
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
| `snapshot`          | Enables XWiki snapshot repositories                                  |
| `integration-tests` | Activates integration-test (`*IT.java`) execution via Failsafe       |
| `docker`            | Runs the Docker-based integration tests (requires Docker installed); used together with `integration-tests` |
| `quality`           | Checkstyle + Revapi + Enforcer checks                                |

## Notes

- The `legacy` profile activates backward-compatibility shim modules and is almost always required.
- The `snapshot` profile enables XWiki snapshot repositories.
- Skip flags worth knowing: `-Dxwiki.checkstyle.skip=true` (Checkstyle),
  `-Dxwiki.revapi.skip=true` (API compat), `-Dxwiki.surefire.captureconsole.skip=true`
  (stdout capture check).
- Checkstyle and Revapi run in the `verify` phase (not `test`), so `mvn test` won't catch them —
  use `mvn clean verify` or `install` to validate.

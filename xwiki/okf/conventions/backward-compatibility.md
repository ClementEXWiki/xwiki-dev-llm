---
title: Backward compatibility policy
stability: durable
summary: Revapi enforces binary/semantic compatibility of public APIs, though not uniformly per module;
  @Unstable marks not-yet-stable API with a max 1-cycle lifetime; evolve interfaces with default
  methods, not new interfaces.
sources:
  - https://dev.xwiki.org/xwiki/bin/view/Community/DevelopmentPractices#HBackwardCompatibility
---

# Backward compatibility policy

XWiki pays close attention to backward compatibility. The **Revapi** Maven plugin (run in the
`quality` profile) fails the build when a public API change breaks compatibility. It checks:

- **Binary** incompatibilities, and
- **Semantic** incompatibilities.

It deliberately does **not** check source incompatibilities (too strict — e.g. adding generics to a
return type should not break the build).

## `@Unstable` annotation

New public API can be marked `@Unstable` (in addition to `@since`) to signal it may change at any
time. Lifecycle rules:

- An API may stay `@Unstable` for at most **one full release cycle**. E.g. an unstable API added in
  N.1 must come out of unstability before N+2 Milestone 1.
- Developers are encouraged to remove `@Unstable` earlier, as soon as the API is considered stable;
  the normal deprecation mechanism then applies for any later change.

## Evolving an interface without breaking it

When you need to add a method to an existing interface, **prefer Java default methods** over
creating a new interface:

- A default method preserves binary compatibility for existing implementors.
- The default implementation should generally **not** throw (e.g. avoid
  `throw new UnsupportedOperationException(...)`), since callers of the default would then fail.

## Deprecation

Deprecated APIs are re-exported from `-legacy` modules (see [[code-style]]); never put new logic
there. Tag deprecations with `@Deprecated(since = "…")` using the [[versioning]] format.

### How `-legacy` modules work

A `-legacy` module is the backward-compatibility companion of a main module. It re-exports the same
`xwiki.extension.features` as the main module and, when it must keep an API that the main module has
dropped, it **weaves the main artifact's bytecode with AspectJ** (`aspectj-maven-plugin` +
`<weaveDependency>`) so the produced legacy jar is a full *replacement* of the main jar:

- A removed **whole type** is re-added as a plain `.java` file in the legacy module (same package).
- A removed **member** is re-added by an aspect: an inter-type declaration for a concrete class, or a
  companion interface with a `default` method plus `declare parents : <Iface> implements <Companion>`
  for an interface method — each delegating to the replacement.
- A weaving legacy module merges its own `META-INF/components.txt` onto the woven one, excludes the
  main jar from the test classpath, and declares the main artifact once as `<type>pom</type>` (trigger)
  and once as `provided` (weaving source). Because it now bundles the main classes, its
  `xwiki.jacoco.instructionRatio` is pinned low.
- Because the woven legacy jar *replaces* the main jar, the WAR must never contain both: the
  xwiki-platform `xwiki-platform-distribution-war-legacydependencies` pom **bans** the main artifact
  (enforcer `bannedDependencies`) and **excludes** it from the clean dependency tree. So the first
  time a legacy module becomes a weaver, that pom must be updated too.

Removing the API from the main module is itself a Revapi break, so it needs a `<revapi.differences>`
ignore (`java.method.removed` / `java.class.removed`) justified by the move to legacy. The full
procedure — migrate callers, remove, re-add, ignore, ban in the WAR, verify — is the `xwiki-legacy`
skill.

## Where Revapi does and does not look

Revapi analyses the primary artifact **and its transitive dependencies**, but only reports differences
on dependency classes the primary artifact's own API *reaches*. Its coverage is therefore **not uniform
per module**: a module can opt out with `<xwiki.revapi.skip>true</xwiki.revapi.skip>`
(`xwiki-platform-oldcore` does), and a weaving `-legacy` module is green by construction since its jar
re-adds whatever the main jar dropped. A break in such a module is invisible both on the module and on
its legacy wrapper, and surfaces instead on an arbitrary **downstream consumer** — whichever one's API
reaches the changed class, often far from the change (removing the `XWikiHibernateStore` constructors
failed `xwiki-platform-extension-script`, which reaches the class via `XWiki.getHibernateStore()`). A
green build on the changed module therefore never means "compatible".

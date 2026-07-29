---
title: SonarQube constant, resource and exception rules
stability: durable
summary: Correct fixes and XWiki-specific drop conditions for S1192 duplicated literals (with the
  reviewer preferences that decide what the constant should be), S2093 try-with-resources — which in
  XWiki is usually a state restore, not a close — plus S2119, S1143/S1163, S5361, S2147 and S3626.
---

# SonarQube constant, resource and exception rules

S1143 · S1163 · S1192 · S2093 · S2119 · S2147 · S3626 · S5361

Read [[index]] for the universal drop conditions first.

## S1192 — define a constant instead of duplicating a literal

Add `private static final String NAME = "literal";` and replace every occurrence **in that one file**.
The rule fires at three or more occurrences, so leaving one or two behind still resolves it.

### Verify the occurrence count before editing

Count the quote-bounded token (`"admin"`, not `admin` — which also matches `"administrator"`) and
compare with the count Sonar reports:

- **Excess occurrences are in comments or Javadoc** → still fixable: replace only on non-comment lines
  and assert the *code* count matches Sonar's.
- **The token is a substring of a longer literal, or Sonar is counting a concatenation fragment** →
  not fixable, drop.
- **The literal is absent from the file entirely** → it was already fixed on master and not yet
  rescanned; drop.

### Where to declare it

**Forward-reference gotcha:** Java forbids using a static field's simple name *before* its textual
declaration inside a static initializer — including static array and collection initializers. Declare
the constant **above** any such use. For uses only inside method bodies, order is irrelevant.

XWiki's Checkstyle does not enforce public-before-private field order, but where `DeclarationOrder`
does bite, place the constant after the public fields and before the first private field that uses it
(conventionally near `LOGGER`). Private constants need no Javadoc.

After the edit, check for lines over 120: a constant *name* longer than the literal it replaces —
especially a fully-qualified reference to one in another class — can breach the limit.

### The "use the already-defined constant" variant

Fixable when the named constant is declared **before** the duplicating line; a forward reference is
not. Drop when the value match is **coincidental and the semantics differ** — a
`DefaultPluginName = "package"` and an XML root element name `"package"` are not the same concept.

When the two usages are conceptually different but the value genuinely coincides (say a script-context
binding key and an async-cache id), the reviewer-preferred form is to introduce a **new,
semantically-named constant whose value references the existing one**:

```java
private static final String MACRO_ASYNC_ID = MACRO_BINDING;
```

This documents the intent and still avoids a duplicated literal — referencing a constant introduces no
new string, so there is no S1192 regression.

### Reviewer preferences — apply these pre-emptively

1. **A literal used only in a log-message concatenation** → do not introduce a constant at all;
   convert to SLF4J parameterized syntax and bracket the placeholder, which is the XWiki convention:
   `LOGGER.warn("Failed to load [{}]", name)`. If that whole message is itself duplicated, extract one
   constant for the entire message.
2. **A domain property or field name** (an XWiki class property) → reuse or add a **public** constant
   on the owning `*DocumentInitializer` (grep its `add*Field("…")` calls). The `"XWiki"` system space
   already lives at `com.xpn.xwiki.XWiki.SYSTEM_SPACE`. Keep it a local private constant instead when
   the owning constant is `private` in an `internal` package, or when a fully-qualified reference would
   breach 120 characters.
3. **Any newly public API — including a field widened from private to public — needs an `@since` tag.**
   See [[versioning]] for the format.

### Checkstyle-excludes trap

Files rich in duplicated literals are often excluded from Checkstyle entirely by a file-level
`<excludes>` in the module pom — which is *why* the duplication accumulated. Sonar scans them
regardless, so the fix is valid. If a reviewer asks you to un-exclude the file, do **not** do it as
part of an S1192 change: that enables the full ruleset and surfaces a large amount of unrelated legacy
debt. Reply with the violation count and offer a separate change. Note also that a class-level
`@SuppressWarnings("checkstyle:MultipleStringLiterals")` suppresses only Checkstyle, not Sonar's
S1192 — such a site is still fixable.

## S2093 — use try-with-resources

`R r = new …(); try { … } finally { r.close(); }` → `try (R r = new …()) { … }`.

**In XWiki most hits are not real closes, and a whole batch can be 100% drops.** The `finally` is
overwhelmingly a context or state **restore**, not a `close()`:

- `pop()` / `push()` on a `MutableRenderingContext`
- `semaphore.release()`, `param.reset()`
- `scriptContext.removeAttribute(…)` or an attribute restore on a **shared** script context
- `xcontext.setWikiReference(previous)`, `xcontext.put(key, previousSkin)`
- the "resource" is a method **parameter**, or is created mid-body and never actually closed

Convert only when the `finally` closes an `AutoCloseable` that was declared **immediately before** the
`try`. If it restores shared state, or acts on something not declared right there, drop. Triage
cheaply and expect to reject the batch — this rule is low-yield in XWiki.

Two follow-ons when a site does qualify: the implicit `close()` throws `IOException`, so if the
surrounding catch is narrower and the method does not declare it, add a `catch (IOException …)`; and
removing an `IOUtils.closeQuietly` call may orphan the `IOUtils` import.

## S2119 — reuse `Random`

Extract `new Random()` / `new SecureRandom()` into a `private static final` field.

## S1143 + S1163 — a `finally` block that throws

These two fire as a **pair** on the same site: a `throw` inside `finally` masks the exception the
`try` was propagating. Replace the throw with a log:

```java
logger.warn("Failed to close …: [{}]", ExceptionUtils.getRootCauseMessage(e));
```

Bracket every placeholder (`[{}]`) per XWiki convention. In an XWiki `@Component` with no logger, add
`@Inject private Logger logger;` — the SLF4J `Logger`, injected, **not** a static field — plus the
`ExceptionUtils` import. XWiki import order is `java`/`javax` first, then `org.*` alphabetically, which
puts `org.slf4j` between `org.apache` and `org.xwiki`. Grep a sibling class for the established message
style.

## S5361 — `replaceAll` → `replace`

Convert only when the first argument reduces to a literal — no regex metacharacters, or a single
escaped one (`"\\+"` → `"+"`) — **and** the replacement string contains no `$` or `\`, which have
special meaning in `replaceAll`'s replacement but not in `replace`'s.

## S2147 — combine catch clauses with identical bodies

`catch (A e) { B } catch (B e) { B }` → `catch (A | B e) { B }`.

- **If the two types are in a subtype relationship, multi-catch is a compile error.** Delete the
  redundant subclass catch instead.
- Deleting a catch can orphan that exception's import.
- If the merged catches carried **different comments**, merge both into the surviving block — a
  reviewer will flag a dropped comment. See [[code-comments]].

## S3626 — remove a redundant jump

Clean only for a genuinely trailing jump: the last statement of a `void` method, or a branch-final
`continue`/`return` where the if-else chain is the whole loop body.

**Drop** when the jump is the branch's *only* statement — removing it leaves an empty block and
Checkstyle `EmptyBlock` fails — or when it sits inside a complex nested try/catch/finally.

## Related

- [[index]] — rule map, denylist, universal drop conditions.
- [[versioning]] — the `@since` format needed when S1192 widens a field to public.
- [[code-comments]] — writing the rationale comment that survives a catch merge.
- [[verification]] — the build gates.

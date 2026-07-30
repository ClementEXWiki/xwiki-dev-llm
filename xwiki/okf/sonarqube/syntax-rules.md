---
title: SonarQube syntax and annotation rules
stability: durable
summary: Correct fixes and XWiki-specific drop conditions for the pure syntax/annotation rules —
  S1116, S1124, S1128, S1161, S1197, S1611, S3878, S6208, S7476. Includes S3878's infinite-recursion
  trap.
---

# SonarQube syntax and annotation rules

S1116 · S1124 · S1128 · S1161 · S1197 · S1611 · S3878 · S6208 · S7476

The safest family: zero dataflow, and (except S3878) no way for a correct edit to change behaviour.
Read [[index]] for the universal drop conditions first.

## S6208 — merge fall-through `case` labels into one comma-separated label

Message: "Merge the previous cases into this one using comma-separated label." Sonar flags the **last**
label of a run of empty fall-through cases: `case 'a': case 'b': case 'c': BODY` → `case 'a', 'b', 'c':
BODY`. Requires Java 14+. Behaviour is identical — the labels shared one body before and after.

- **Count the group upwards from the flagged line** until a non-`case` line, and merge exactly that
  run. Several groups in one `switch` are several issues; process them highest-line-first.
- A long run needs wrapping: fill to 120 and continue on a `+4`-indented line, closing with the `:`
  after the last label. A 32-label group (`TagStack`'s special-symbol set) wraps to two lines and reads
  fine.
- **Drop the group when a case in the run has a body**, even an empty one with a comment, or when a
  `// fallthrough` comment marks a *non-empty* case falling into the run — that comment documents real
  fall-through behaviour and merging it away changes what the reader is told. Labels *after* such a
  comment can still be merged with each other.
- Escapes are copied verbatim (`'\''`, `'\\'`, `'\"'`, `'\t'`); a numeric label (`case 160:`) can
  join a char run.

## S1128 — unused import

Delete the flagged `import …;` line. **Trust Sonar** here: it correctly keeps imports referenced only
from a `{@link}` in Javadoc, so a flagged import really is unused. A delegating subclass can
legitimately have ten or more removable imports at once.

## S1197 — array designator on the variable

`TYPE NAME[]` → `TYPE[] NAME`.

Drop condition: none in practice. The trap is in *matching*, not in the fix — a naive
`\b(\w+)\s+(\w+)\[\]` pattern also matches a return type that is *already* in the correct form when a
modifier precedes it (`public String[] foo`). Require that the `[]` is not followed by an identifier.

## S1116 — empty statement

Three shapes: a lone `;` on its own line (delete the line), a trailing `;;` (strip one), and `};`
where the `}` closes a block or method (strip the `;`).

**Never strip the `;` from `new Foo(){…};` or `Type x = new Foo(){…};`** — that semicolon terminates a
declaration or expression statement and is required. Sonar does not flag those, so distinguish the
shapes by the exact flagged line rather than by pattern.

## S1161 — missing `@Override`

Purely additive: insert an `@Override` line above the flagged signature at the same indent. Trust
Sonar. A method in an interface that redeclares a super-interface method legitimately takes
`@Override` (legal since Java 6).

Sanity-check before writing: the flagged line contains a `(`, and neither it nor the line above is
already `@Override`.

## S1611 — redundant parentheses around a lambda parameter

`(x) -> …` → `x -> …`, single untyped parameter only.

Pairs with S1602 (see [[simplification-rules]]) — the *same* lambda is often flagged by both rules,
so make one combined edit rather than two.

## S1124 — modifier order

Reorder the leading run of modifiers into canonical JLS order:

```
public/protected/private → abstract → default → static → final → transient → volatile
→ synchronized → native → strictfp
```

In practice almost always `final static` → `static final` or `static public` → `public static`.

- **Zero behaviour or visibility change → no `@since` tag**, even on a public constant.
- Sites cluster many-per-file (a block of constants can yield a dozen in one file).
- Verification tip: assert that the reordered modifier run actually *differs* from the original. A
  no-op means the flagged line has drifted and points at something else now.

## S3878 — array created for a varargs parameter

Two message variants: "Remove this array creation / and simply pass the elements", and "Disambiguate
this call by either casting as Object or Object[]". The fix is to drop the `new T[]{…}` wrapper and
pass the elements directly.

For a multi-line array, edit the opening line (drop `new T[]{`) and the closing line (drop one `}`),
then normalise the continuation indent to `+4`.

### The infinite-recursion trap (the dominant drop shape)

**Before touching any `new Object[]{…}` argument, check whether the enclosing method has the same
name as the method being called. If it does, drop the issue.**

Spreading the array's elements re-binds the call from the varargs overload to a **fixed-arity
overload of the same name** — which is frequently the enclosing method itself, producing infinite
recursion. The canonical XWiki case is the SLF4J `Logger` implementations in `xwiki-commons-logging-*`
(`LogQueue`, `LogTree`, the `AbstractLogger` in `logging-common`): their
`trace/debug/info/warn/error(Marker, String, Object)` overrides deliberately delegate to the varargs
sibling via `new Object[] { arg }`. The array *is* the disambiguation — which is exactly what the
"Disambiguate this call…" message variant is warning about. Every site of that shape is a drop.

### Other drop conditions

- A single `new Object[]{y}` where `y` could itself be an array — genuinely ambiguous.
- An **empty-array** delegation `foo(x, new Object[]{})` where a fixed-arity overload of the same name
  exists — the same recursion trap. Reducing an empty array to no arguments is *safe* for reflection
  on an external class (`getConstructor()` / `newInstance()` have unambiguous no-arg forms).

## S7476 — a single-line comment should start with exactly two slashes

The safest rule there is: comments only, so it cannot change behaviour.

In XWiki this is essentially always a **decorative banner line of pure slashes** (`//////`,
`////////////////`, occasionally a lone `///`) framing a real comment. **Delete the banner line** and
keep the comment underneath — converting the banner to `//` would leave a meaningless empty comment.

Gotcha: a standalone separator (blank line / banner / blank line, common in test files) leaves two
consecutive blank lines once the banner is deleted. Collapse the pair, and check the diff for an
introduced triple newline.

## Related

- [[index]] — rule map, denylist, universal drop conditions.
- [[simplification-rules]] — S1602, which pairs with S1611.
- [[verification]] — the build gates that confirm a fix.

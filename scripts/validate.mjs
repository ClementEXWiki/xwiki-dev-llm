#!/usr/bin/env node
// Repo consistency validator for xwiki-dev-llm. Enforces the invariants that are otherwise kept in
// sync by hand, so they can never drift silently:
//   1. Every skill directory under xwiki/skills/ is listed in README.md, and (except the OKF
//      governor xwiki-knowledge) in xwiki/okf/index.md.
//   2. Each SKILL.md frontmatter `name:` equals its directory name.
//   3. The plugin version fields are identical across all hosts (Claude marketplace + plugin, Kimi
//      plugin, opencode config comment).
//   4. Every OKF topic file is referenced in xwiki/okf/index.md AND in the injected mirror
//      xwiki/instructions/xwiki-org.md.
//   5. Every `okf/...md` path a skill cites actually exists. Skills delegate their rules to the OKF
//      rather than restating them, so a renamed or deleted topic would otherwise leave a skill
//      pointing at nothing — and a reviewer that cannot read its rule source fails silently.
// Node built-ins only. Run from anywhere: `node scripts/validate.mjs`.
// Exit 0 = all invariants hold; exit 1 = violations (each printed on its own line).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const errors = [];

// ---- Invariants 1 & 2: skills ----------------------------------------------------------------
const skills = readdirSync(join(repoRoot, "xwiki/skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const readme = read("README.md");
const okfIndex = read("xwiki/okf/index.md");

for (const skill of skills) {
  const skillMd = read(`xwiki/skills/${skill}/SKILL.md`);
  const m = skillMd.match(/^name:\s*(\S+)\s*$/m);
  if (!m) {
    errors.push(`xwiki/skills/${skill}/SKILL.md: missing frontmatter 'name:'`);
  } else if (m[1] !== skill) {
    errors.push(`xwiki/skills/${skill}/SKILL.md: frontmatter name '${m[1]}' != directory '${skill}'`);
  }
  // Backtick-delimited so xwiki-convert-tests does not spuriously match xwiki-convert-tests-docker.
  if (!readme.includes(`\`${skill}\``)) {
    errors.push(`README.md: skill '${skill}' is not listed in the Skills section`);
  }
  if (skill !== "xwiki-knowledge" && !okfIndex.includes(`\`${skill}\``)) {
    errors.push(`xwiki/okf/index.md: skill '${skill}' is not listed in "Related skills"`);
  }
}

// ---- Invariant 3: version sync ---------------------------------------------------------------
const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
const pluginJson = JSON.parse(read("xwiki/.claude-plugin/plugin.json"));
const kimiPluginJson = JSON.parse(read("kimi.plugin.json"));
// opencode.jsonc is JSONC (comments), and opencode's config schema has no version field, so the
// version is carried in a `// version: X.Y.Z` comment instead.
const opencodeVersion = read("opencode.jsonc").match(/^\s*\/\/\s*version:\s*(\d+\.\d+\.\d+)/m)?.[1];
const versions = {
  "marketplace.metadata.version": marketplace.metadata?.version,
  "marketplace.plugins[xwiki].version": marketplace.plugins?.find((p) => p.name === "xwiki")?.version,
  "xwiki/.claude-plugin/plugin.json version": pluginJson.version,
  "kimi.plugin.json version": kimiPluginJson.version,
  "opencode.jsonc version comment": opencodeVersion,
};
if (new Set(Object.values(versions)).size !== 1) {
  errors.push(`Plugin version mismatch across manifests: ${JSON.stringify(versions)}`);
}

// ---- Invariant 4: OKF topic map completeness -------------------------------------------------
const orgMd = read("xwiki/instructions/xwiki-org.md");
const okfRoot = join(repoRoot, "xwiki/okf");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
for (const abs of walk(okfRoot)) {
  if (!abs.endsWith(".md")) continue;
  if (abs === join(okfRoot, "index.md")) continue;        // the map itself
  const base = basename(abs, ".md");
  if (base === "_template") continue;                     // ADR template, not a topic
  if (/[\\/]decisions[\\/]/.test(abs)) continue;          // ADRs are listed individually only in index.md
  if (!okfIndex.includes(base)) {
    errors.push(`xwiki/okf/index.md: OKF topic '${base}' is not referenced in the map`);
  }
  if (!orgMd.includes(base)) {
    errors.push(`xwiki/instructions/xwiki-org.md: OKF topic '${base}' is not referenced in the mirror map`);
  }
}

// ---- Invariant 5: OKF paths cited by skills resolve ------------------------------------------
// Matches `okf/<dir>/<topic>.md` wherever it appears in a SKILL.md, in backticks or bare.
const okfRefPattern = /okf\/[a-z0-9-]+\/[a-z0-9-]+\.md/g;
for (const skill of skills) {
  const skillMd = read(`xwiki/skills/${skill}/SKILL.md`);
  for (const ref of new Set(skillMd.match(okfRefPattern) ?? [])) {
    if (!existsSync(join(repoRoot, "xwiki", ref))) {
      errors.push(`xwiki/skills/${skill}/SKILL.md: cites '${ref}', which does not exist`);
    }
  }
}

// ---- Report ----------------------------------------------------------------------------------
if (errors.length) {
  console.error(`validate.mjs: ${errors.length} consistency violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate.mjs: OK (${skills.length} skills, Claude + Kimi + opencode versions in sync, OKF map complete).`);

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
//   5. The injected mirror stays within its size budget. Invariant 4 can only ever demand *more*
//      text in a file that is loaded into every session; without a ceiling the map grows by
//      accretion, because each extension appends and none ever cuts.
//   6. When a branch changes anything under xwiki/ (i.e. anything that ships), the plugin version
//      is strictly greater than the base branch's. Invariant 3 only proves the manifests agree with
//      each other — they agree just as happily on a version that never moved, and Claude Code pulls
//      an update only when the version *increases*, so an un-bumped change silently reaches nobody.
//   7. Every `okf/...md` path a skill cites actually exists. Skills delegate their rules to the OKF
//      rather than restating them, so a renamed or deleted topic would otherwise leave a skill
//      pointing at nothing — and a reviewer that cannot read its rule source fails silently.
// Node built-ins only. Run from anywhere: `node scripts/validate.mjs`.
// Exit 0 = all invariants hold; exit 1 = violations (each printed on its own line).

import { execFileSync } from "node:child_process";
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

// ---- Invariant 5: the always-on file stays small ---------------------------------------------
// xwiki-org.md is injected at the start of every session in every xwiki/* repo, so each line is
// paid for by every task, including the ones that never needed it. The map is routing only —
// topic names; okf/index.md is where a topic gets described. Raise a budget only with a reason.
const ORG_MAX_BYTES = 8000;
const ORG_MAP_MAX_BYTES = 1800;
if (Buffer.byteLength(orgMd) > ORG_MAX_BYTES) {
  errors.push(
    `xwiki/instructions/xwiki-org.md: ${Buffer.byteLength(orgMd)} bytes exceeds the ${ORG_MAX_BYTES}-byte budget ` +
      `for the always-on file — move the detail into an okf/ topic (described in okf/index.md) or a skill`
  );
}
const mapStart = orgMd.indexOf("OKF map");
const mapEnd = orgMd.indexOf("**Capturing learnings:**");
if (mapStart === -1 || mapEnd === -1 || mapEnd < mapStart) {
  errors.push(
    `xwiki/instructions/xwiki-org.md: cannot locate the OKF map block ` +
      `(expected "OKF map" … "**Capturing learnings:**")`
  );
} else {
  const mapBytes = Buffer.byteLength(orgMd.slice(mapStart, mapEnd));
  if (mapBytes > ORG_MAP_MAX_BYTES) {
    errors.push(
      `xwiki/instructions/xwiki-org.md: the OKF map block is ${mapBytes} bytes, over the ${ORG_MAP_MAX_BYTES}-byte ` +
        `budget — the mirror lists topic *names*; describe the topic in xwiki/okf/index.md instead`
    );
  }
}

// ---- Invariant 6: the shipped version actually increased -------------------------------------
// Comparing against the base branch, because "did this change ship?" is only answerable relative to
// what is already released. Skipped, not failed, when the base ref is not fetched (a shallow clone,
// or a checkout with no remote) so the other invariants still run.
const git = (args) => {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};
const parseVersion = (v) => (v ?? "").split(".").map(Number);
const isGreater = (a, b) => {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  if (x.length !== 3 || x.some(Number.isNaN) || y.length !== 3 || y.some(Number.isNaN)) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
// On a PR the base is whatever it targets; otherwise assume the default branch.
const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/master";
const baseSha = git(["rev-parse", "--verify", "--quiet", `${baseRef}^{commit}`]);
if (!baseSha) {
  console.log(`validate.mjs: note - ${baseRef} is not available, skipping the version-increase check`);
} else if (baseSha !== git(["rev-parse", "--verify", "HEAD"])) {
  // Base -> working tree, so an un-bumped change is caught before it is even committed.
  const changed = (git(["diff", "--name-only", baseSha, "--"]) ?? "").split("\n");
  if (changed.some((f) => f.startsWith("xwiki/"))) {
    const baseMarketplace = git(["show", `${baseSha}:.claude-plugin/marketplace.json`]);
    const baseVersion = baseMarketplace && JSON.parse(baseMarketplace).metadata?.version;
    const version = versions["marketplace.metadata.version"];
    const greater = isGreater(version, baseVersion);
    if (greater === null) {
      errors.push(`Cannot compare plugin versions: '${version}' vs '${baseVersion}' on ${baseRef}`);
    } else if (!greater) {
      errors.push(
        `Plugin version ${version} is not greater than ${baseVersion} on ${baseRef}, but this branch ` +
          `changes files under xwiki/ - bump it, or installed plugins will never pull the change`
      );
    }
  }
}

// ---- Invariant 7: OKF paths cited by skills resolve ------------------------------------------
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

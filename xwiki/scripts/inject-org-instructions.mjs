#!/usr/bin/env node
// SessionStart hook for the xwiki plugin.
// Injects org-wide XWiki conventions as additionalContext, but ONLY when the current repo
// belongs to the `xwiki` or `xwiki-contrib` GitHub org. Personal repos get nothing.
// Written in Node (ships with Claude Code and Kimi Code) so it works on Windows, macOS and Linux.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Kimi passes the project directory in the hook payload's `cwd`; Claude sets CLAUDE_PROJECT_DIR.
// Fallback to the current working directory when neither is available.
let projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // ignore — not running as a piped hook
}
if (payload.cwd) {
  projectDir = payload.cwd;
}

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.env.KIMI_PLUGIN_ROOT;

// Resolve the repo's origin remote. If this isn't a git repo, inject nothing.
let remote = "";
try {
  remote = execFileSync("git", ["-C", projectDir, "remote", "get-url", "origin"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  }).trim();
} catch {
  process.exit(0);
}

// Scope: only xwiki/* and xwiki-contrib/* repos (handles both SSH and HTTPS remotes).
if (!/github\.com[:/](xwiki|xwiki-contrib)\//.test(remote)) {
  process.exit(0);
}

// The plugin root differs by host: Claude points at the `xwiki/` subdirectory, Kimi points at the
// repository root. Try both layouts so the same script works for both runtimes.
let text;
for (const relativePath of ["instructions/xwiki-org.md", "xwiki/instructions/xwiki-org.md"]) {
  try {
    text = readFileSync(`${pluginRoot}/${relativePath}`, "utf8");
    break;
  } catch {
    // try next candidate
  }
}
if (!text) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: text
    }
  })
);

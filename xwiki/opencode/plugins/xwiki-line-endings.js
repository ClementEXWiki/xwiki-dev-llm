// opencode plugin: XWiki line-ending guard.
//
// Ports the Claude Code / Kimi Code PostToolUse hook (xwiki/scripts/check-line-endings.mjs) to
// opencode: after a write/edit, verify the file's line endings match the repo's .gitattributes
// `eol`. On a mismatch it throws so the model rewrites the file with the right endings, avoiding a
// spurious whole-file diff.
//
// Install it by symlinking (or copying) this file into one of opencode's plugin directories:
//   ~/.config/opencode/plugins/   (global)   or   <repo>/.opencode/plugins/   (per project)
// See README.md.
//
// The shared check logic is imported by absolute path from the checkout (via XWIKI_LLM_HOME) so this
// plugin does not depend on its own — possibly symlinked — location. The plugin no-ops silently when
// XWIKI_LLM_HOME is unset or the shared script cannot be loaded.

import { pathToFileURL } from "node:url";

export const XWikiLineEndings = async () => {
  const home = process.env.XWIKI_LLM_HOME;
  if (!home) return {};

  let checkLineEndings;
  let formatLineEndingMessage;
  try {
    ({ checkLineEndings, formatLineEndingMessage } = await import(
      pathToFileURL(`${home}/xwiki/scripts/check-line-endings.mjs`).href
    ));
  } catch {
    return {}; // shared script not found — nothing to enforce
  }

  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "write" && input.tool !== "edit") return;
      const filePath = output?.args?.filePath;
      const result = checkLineEndings(filePath);
      if (!result) return;
      throw new Error(formatLineEndingMessage(filePath, result));
    },
  };
};

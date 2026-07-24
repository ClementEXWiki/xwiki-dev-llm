#!/usr/bin/env node
// Start the SonarQube MCP server in Docker with the project workspace mounted at
// /app/mcp-workspace so analysis tools can read files by path instead of receiving
// full file contents.
//
// Kimi Code and opencode do not expand shell-style ${PWD} inside an MCP command,
// so the workspace path is resolved at runtime from the current working directory
// (the session's working directory).

import { spawn } from "node:child_process";

const workspace = process.cwd();

const child = spawn(
  "docker",
  [
    "run", "-i", "--rm", "--pull=always",
    "-e", "SONARQUBE_URL",
    "-e", "SONARQUBE_TOKEN",
    "-e", "SONARQUBE_ORG",
    "-e", "SONARQUBE_PROJECT_KEY",
    "-e", "SONARQUBE_TOOLSETS",
    "-e", "SONARQUBE_ADVANCED_ANALYSIS_ENABLED",
    "-v", `${workspace}:/app/mcp-workspace:rw`,
    "mcp/sonarqube",
  ],
  { stdio: "inherit" },
);

child.on("error", (err) => {
  console.error(`Failed to start SonarQube MCP server: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
